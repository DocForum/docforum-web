import { describe, expect, it } from 'vitest';
import template from '../../index.html?raw';
import { canonicalUrl, PUBLIC_PAGES, type PublicPageDef } from '../pages/public-routes';
import { BUILD_BASE, renderPublicPage } from './entry-server';
import { prerenderPage, validatePrerenderedHtml } from './html';

interface Rendered {
  def: PublicPageDef;
  appHtml: string;
  html: string;
}

function renderPage(def: PublicPageDef): Rendered {
  const appHtml = renderPublicPage(def.path);
  return { def, appHtml, html: prerenderPage({ template, appHtml, def, base: BUILD_BASE }) };
}

const rendered = PUBLIC_PAGES.map((def) => renderPage(def));
const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html');

describe('renderPublicPage', () => {
  it('renders against the same base the client build uses', () => {
    expect(BUILD_BASE).toBe('/');
  });

  for (const { def, appHtml } of rendered) {
    describe(def.path, () => {
      it('puts the real page heading and body in the markup', () => {
        expect(appHtml).toContain('<h1');
        expect(appHtml).toContain(def.heading);
        expect(appHtml.length).toBeGreaterThan(1000);
      });

      it('runs no authenticated code path (no session, logged-out layout)', () => {
        expect(appHtml).not.toContain('Log out');
        expect(appHtml).toContain('Log in');
        expect(appHtml).toContain('Sign up');
      });

      it('contains no script execution — content stands without client JS', () => {
        expect(appHtml).not.toContain('<script');
      });
    });
  }
});

describe('prerendered output per route', () => {
  for (const { def, html } of rendered) {
    describe(def.path, () => {
      it('passes the prerender validation', () => {
        expect(validatePrerenderedHtml(html, def)).toEqual([]);
      });

      it('is a parseable document with route-specific metadata', () => {
        const doc = parse(html);
        expect(doc.title).toBe(def.title);
        expect(doc.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
          def.description,
        );
        expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
          canonicalUrl(def.path),
        );
        expect(doc.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe(
          canonicalUrl(def.path),
        );
        expect(doc.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(
          def.title,
        );
      });

      it('renders the content inside #root without the loading shell', () => {
        const doc = parse(html);
        const root = doc.querySelector('#root');
        expect(root).not.toBeNull();
        expect(root?.querySelector('h1')?.textContent).toBe(def.heading);
        expect(root?.textContent ?? '').toContain('DocForum');
        expect(doc.querySelector('#app-loading')).toBeNull();
        expect(doc.querySelector('script[type="module"]')).not.toBeNull();
      });

      it('is navigable without client JS: links are real paths, not fragments', () => {
        const doc = parse(html);
        const hrefs = [...doc.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
        const publicHrefs = new Set(
          PUBLIC_PAGES.map((page) => (page.path === '/' ? '/' : `${page.path}/`)),
        );

        // Every page links on to at least one other public route as a real,
        // crawlable path — the static output forms a linked subgraph.
        expect(hrefs.some((href) => href !== null && publicHrefs.has(href))).toBe(true);
        // App-only routes boot the SPA on the hash instead of 404ing.
        expect(hrefs).toContain('/#/login');
        expect(hrefs).toContain('/#/signup');
        // Nothing links into hash routes from static markup.
        expect(hrefs.some((href) => href?.startsWith('#/'))).toBe(false);
      });
    });
  }
});

describe('cross-route metadata', () => {
  it('gives every route a unique title, description and canonical URL', () => {
    const titles = rendered.map(({ html }) => html.match(/<title>([^<]*)<\/title>/)?.[1]);
    const descriptions = rendered.map(
      ({ html }) => html.match(/name="description" content="([^"]*)"/)?.[1],
    );
    const canonicals = rendered.map(
      ({ html }) => html.match(/rel="canonical" href="([^"]*)"/)?.[1],
    );

    for (const [label, values] of [
      ['titles', titles],
      ['descriptions', descriptions],
      ['canonicals', canonicals],
    ] as const) {
      expect(values.every(Boolean), label).toBe(true);
      expect(new Set(values).size, label).toBe(PUBLIC_PAGES.length);
    }
  });

  it('advertises only public routes in the sitemap and robots', async () => {
    const { buildRobots, buildSitemap } = await import('../pages/public-routes');
    const sitemap = buildSitemap(PUBLIC_PAGES.map((page) => page.path));
    const robots = buildRobots();

    const locs = [...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1]);
    expect(locs).toEqual(rendered.map(({ def }) => canonicalUrl(def.path)));
    expect(robots).toContain(`Sitemap: ${canonicalUrl('/')}sitemap.xml`);
    expect(sitemap).not.toContain('/patient');
    expect(sitemap).not.toContain('/admin');
    expect(sitemap).not.toContain('#');
  });
});
