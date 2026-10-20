import { describe, expect, it } from 'vitest';
import template from '../../index.html?raw';
import { PUBLIC_PAGES, canonicalUrl, publicPageByPath } from '../pages/public-routes';
import {
  applyHeadMeta,
  injectAppHtml,
  prerenderPage,
  rewriteInternalLinks,
  validatePrerenderedHtml,
} from './html';

const privacy = publicPageByPath('/privacy')!;

function parse(html: string) {
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('applyHeadMeta', () => {
  const html = applyHeadMeta(template, privacy);

  it('replaces the generic title with the route title, exactly once', () => {
    const titles = html.match(/<title>[^<]*<\/title>/g) ?? [];
    expect(titles).toEqual(['<title>Privacy — DocForum</title>']);
  });

  it('injects description, canonical and Open Graph tags before </head>', () => {
    const head = html.slice(0, html.indexOf('</head>'));
    expect(head).toContain(`<meta name="description" content="${privacy.description}" />`);
    expect(head).toContain(`<link rel="canonical" href="${canonicalUrl('/privacy')}" />`);
    expect(head).toContain('<meta property="og:title" content="Privacy — DocForum" />');
    expect(head).toContain(`<meta property="og:url" content="${canonicalUrl('/privacy')}" />`);
    expect(head).toContain('<meta property="og:site_name" content="DocForum" />');
  });

  it('keeps the template head intact (theme script, fonts, assets)', () => {
    expect(html).toContain("localStorage.getItem('docforum-theme')");
    expect(html).toContain('fonts.googleapis.com/css2');
    expect(html).toContain('rel="stylesheet"');
    expect(html).toContain('type="module"');
  });

  it('escapes values that could break out of a tag or attribute', () => {
    const hostile = {
      ...privacy,
      title: 'x"><script>alert(1)</script>',
      description: 'a" onload="alert(1)',
    };
    const out = applyHeadMeta(template, hostile);
    expect(out).not.toContain('<script>alert(1)</script>');
    expect(out).toContain('content="a&quot; onload=&quot;alert(1)"');
    expect(out).not.toContain('content="a" onload="alert(1)"');
  });
});

describe('injectAppHtml', () => {
  const html = injectAppHtml(template, '<h1 id="rendered">Rendered</h1>');

  it('replaces the loading shell with the rendered markup', () => {
    expect(html).toContain('<h1 id="rendered">Rendered</h1>');
    expect(html).not.toContain('<div id="app-loading"');
  });

  it('keeps the script and stylesheet references', () => {
    expect(html).toMatch(/<script type="module"[^>]*src="[^"]*"><\/script>/);
    expect(html).toContain('rel="stylesheet"'); // fonts stylesheet from the template head
  });

  it('produces well-formed HTML the DOM parser accepts', () => {
    const doc = parse(html);
    expect(doc.querySelector('#rendered')?.textContent).toBe('Rendered');
    expect(doc.querySelector('#root')).not.toBeNull();
    expect(doc.querySelector('script[type="module"]')).not.toBeNull();
  });

  it('refuses a template without a root container', () => {
    expect(() => injectAppHtml('<html><body></body></html>', '<p>x</p>')).toThrow(/id="root"/);
  });
});

describe('rewriteInternalLinks', () => {
  const appHtml = [
    '<a href="/faq">FAQ</a>',
    '<a href="/">Home</a>',
    '<a href="/signup">Sign up</a>',
    '<a href="/patient/settings">Settings</a>',
    '<a href="https://github.com/DocForum/docforum-web">Source</a>',
    '<link rel="stylesheet" href="/assets/index.css" />',
    '<img src="/assets/tile.png" />',
  ].join('');

  it('turns public routes into base-prefixed static paths', () => {
    const out = rewriteInternalLinks(appHtml, '/docforum-web/');
    expect(out).toContain('href="/docforum-web/faq/"');
    expect(out).toContain('href="/docforum-web/"');
  });

  it('turns app routes into hash routes that boot the SPA', () => {
    const out = rewriteInternalLinks(appHtml, '/docforum-web/');
    expect(out).toContain('href="/docforum-web/#/signup"');
    expect(out).toContain('href="/docforum-web/#/patient/settings"');
  });

  it('leaves external URLs, assets and images untouched', () => {
    const out = rewriteInternalLinks(appHtml, '/');
    expect(out).toContain('href="https://github.com/DocForum/docforum-web"');
    expect(out).toContain('src="/assets/tile.png"');
    expect(out).toContain('href="/assets/index.css"');
  });

  it('works at the root base', () => {
    const out = rewriteInternalLinks('<a href="/privacy">Privacy</a>', '/');
    expect(out).toContain('href="/privacy/"');
  });
});

describe('prerenderPage + validatePrerenderedHtml', () => {
  const appHtml = `<div class="page"><h1>${privacy.heading}</h1><p>Body copy.</p><a href="/faq">FAQ</a></div>`;
  const html = prerenderPage({ template, appHtml, def: privacy, base: '/' });

  it('passes its own validation', () => {
    expect(validatePrerenderedHtml(html, privacy)).toEqual([]);
  });

  it('warns when content never made it into #root', () => {
    const empty = injectAppHtml(template, '   ');
    expect(validatePrerenderedHtml(empty, privacy)).toContain(
      '#root is empty — page content is not in the HTML',
    );
  });

  it('warns when a page has no heading or the wrong heading', () => {
    const wrongHeading = injectAppHtml(template, '<div><h1>Something else</h1></div>');
    expect(validatePrerenderedHtml(wrongHeading, privacy).join()).toMatch(/heading text not found/);
    const noHeading = injectAppHtml(template, '<div><p>No heading</p></div>');
    expect(validatePrerenderedHtml(noHeading, privacy)).toContain('no <h1> in prerendered content');
  });

  it('warns when authenticated UI leaks into a public page', () => {
    const leaked = injectAppHtml(
      template,
      '<div><h1>Privacy</h1><button>Log out</button></div>',
    );
    expect(validatePrerenderedHtml(leaked, privacy).join()).toMatch(/authenticated UI leaked/);
  });

  it('warns when the wrong title or missing metadata ships', () => {
    const noTitle = html.replace(/<title>[^<]*<\/title>/, '<title>DocForum</title>');
    expect(validatePrerenderedHtml(noTitle, privacy).join()).toMatch(/missing or wrong <title>/);

    const noCanonical = html.replace(/<link rel="canonical"[^>]*>/, '');
    expect(validatePrerenderedHtml(noCanonical, privacy)).toContain('missing canonical link');
  });
});

describe('every registered page can be prerendered from the real template', () => {
  for (const def of PUBLIC_PAGES) {
    it(`prerenders ${def.path}`, () => {
      const appHtml = `<h1>${def.heading}</h1><p>content for ${def.path}</p>`;
      const html = prerenderPage({ template, appHtml, def, base: '/' });
      expect(validatePrerenderedHtml(html, def)).toEqual([]);
    });
  }
});
