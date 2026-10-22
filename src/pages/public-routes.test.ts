import { describe, expect, it } from 'vitest';
import {
  PUBLIC_PAGES,
  SITE_BASE,
  SITE_ORIGIN,
  buildRobots,
  buildSitemap,
  canonicalUrl,
  metaTagsFor,
  publicPageByPath,
  publicPathUrl,
  publicRoutePathFromLocation,
  restorePublicPathIntoHash,
} from './public-routes';

const REQUIRED_PATHS = [
  '/',
  '/how-it-works',
  '/for-doctors',
  '/for-facilities',
  '/privacy',
  '/accessibility',
  '/faq',
];

describe('public page registry', () => {
  it('lists the landing page plus the six required information pages', () => {
    expect(PUBLIC_PAGES.map((page) => page.path)).toEqual(REQUIRED_PATHS);
  });

  it('has a unique title, heading and description per route', () => {
    for (const key of ['title', 'heading', 'description'] as const) {
      const values = PUBLIC_PAGES.map((page) => page[key]);
      expect(new Set(values).size, `duplicate ${key}`).toBe(values.length);
      expect(values.every((value) => value.trim().length > 0)).toBe(true);
    }
  });

  it('keeps descriptions short enough for search result snippets', () => {
    for (const page of PUBLIC_PAGES) {
      expect(page.description.length, page.path).toBeLessThanOrEqual(160);
    }
  });

  it('resolves a page by path and rejects unknown paths', () => {
    expect(publicPageByPath('/faq')?.title).toBe('FAQ — DocForum');
    expect(publicPageByPath('/admin')).toBeUndefined();
    expect(publicPageByPath('faq')).toBeUndefined();
  });
});

describe('canonical URLs', () => {
  it('uses the verified GitHub Pages production origin and base', () => {
    expect(SITE_ORIGIN).toBe('https://docforum.github.io');
    expect(SITE_BASE).toBe('/docforum-web/');
    expect(canonicalUrl('/privacy')).toBe('https://docforum.github.io/docforum-web/privacy/');
    expect(canonicalUrl('/')).toBe('https://docforum.github.io/docforum-web/');
  });

  it('normalizes trailing slashes for directory-style URLs', () => {
    expect(publicPathUrl('/faq')).toBe('/docforum-web/faq/');
    expect(publicPathUrl('/faq/')).toBe('/docforum-web/faq/');
    expect(publicPathUrl('/')).toBe('/docforum-web/');
    expect(publicPathUrl('/faq', '/')).toBe('/faq/');
    expect(publicPathUrl('/', '/')).toBe('/');
  });

  it('points the sitemap at the site root', () => {
    expect(canonicalUrl('/')).toBe(`${SITE_ORIGIN}${SITE_BASE}`);
  });
});

describe('metaTagsFor', () => {
  it('emits description, canonical and Open Graph tags with matching values', () => {
    const def = publicPageByPath('/for-doctors')!;
    const tags = metaTagsFor(def);
    const byKey = new Map(tags.map((tag) => [tag.key, tag]));

    expect(byKey.get('description')?.content).toBe(def.description);
    expect(byKey.get('canonical')?.href).toBe('https://docforum.github.io/docforum-web/for-doctors/');
    expect(byKey.get('og:title')?.content).toBe(def.title);
    expect(byKey.get('og:url')?.href ?? byKey.get('og:url')?.content).toBe(
      'https://docforum.github.io/docforum-web/for-doctors/',
    );
    expect(tags.map((tag) => `${tag.attribute}:${tag.key}`)).toContain('rel:canonical');
  });

  it('produces a different og:url for every route', () => {
    const urls = PUBLIC_PAGES.map(
      (page) => metaTagsFor(page).find((tag) => tag.key === 'og:url')?.content,
    );
    expect(new Set(urls).size).toBe(PUBLIC_PAGES.length);
  });
});

describe('buildSitemap', () => {
  const sitemap = buildSitemap(PUBLIC_PAGES.map((page) => page.path));

  it('lists exactly the public canonical URLs', () => {
    const locs = [...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1]);
    expect(locs).toEqual(PUBLIC_PAGES.map((page) => canonicalUrl(page.path)));
    expect(locs).toHaveLength(7);
  });

  it('is a valid urlset document', () => {
    expect(sitemap).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(sitemap.trimEnd().endsWith('</urlset>')).toBe(true);
  });

  it('never advertises hash, authenticated, or non-existent routes', () => {
    expect(sitemap).not.toContain('#');
    for (const privatePath of ['/login', '/signup', '/patient', '/doctor', '/facility', '/admin', '/care']) {
      expect(sitemap, privatePath).not.toContain(`${privatePath}/`);
      expect(sitemap, privatePath).not.toContain(`${privatePath}<`);
    }
  });
});

describe('buildRobots', () => {
  const robots = buildRobots();

  it('allows crawling and points at the sitemap', () => {
    expect(robots).toContain('User-agent: *');
    expect(robots).toContain('Allow: /');
    expect(robots).toContain(`Sitemap: ${canonicalUrl('/')}sitemap.xml`);
  });

  it('does not disallow any public page', () => {
    expect(robots).not.toMatch(/^Disallow:/m);
  });
});

describe('publicRoutePathFromLocation', () => {
  it('maps a prerendered path back to the router path', () => {
    expect(publicRoutePathFromLocation('/faq', '/')).toBe('/faq');
    expect(publicRoutePathFromLocation('/faq/', '/')).toBe('/faq');
    expect(publicRoutePathFromLocation('/how-it-works', '/')).toBe('/how-it-works');
    expect(publicRoutePathFromLocation('/faq/index.html', '/')).toBe('/faq');
  });

  it('strips the GitHub Pages base before matching', () => {
    expect(publicRoutePathFromLocation('/docforum-web/privacy/', '/docforum-web/')).toBe('/privacy');
    // `/docforum-web` (no trailing slash) is the site root — Pages redirects
    // it to `/docforum-web/`, so it maps to the landing page.
    expect(publicRoutePathFromLocation('/docforum-web', '/docforum-web/')).toBe('/');
    expect(publicRoutePathFromLocation('/docforum-web/', '/docforum-web/')).toBe('/');
    expect(publicRoutePathFromLocation('/docforum-web/', '/')).toBe(null);
  });

  it('rejects non-public and app-only paths', () => {
    expect(publicRoutePathFromLocation('/login', '/')).toBe(null);
    expect(publicRoutePathFromLocation('/patient', '/')).toBe(null);
    expect(publicRoutePathFromLocation('/admin/audit', '/')).toBe(null);
    expect(publicRoutePathFromLocation('/', '/')).toBe('/');
  });
});

describe('restorePublicPathIntoHash', () => {
  it('rewrites a public path into the equivalent hash route, keeping the query', () => {
    const rewritten: string[] = [];
    const restored = restorePublicPathIntoHash(
      { pathname: '/faq/', hash: '', search: '?ref=email' },
      (url) => rewritten.push(url),
      '/',
    );

    expect(restored).toBe(true);
    expect(rewritten).toEqual(['/#/faq?ref=email']);
  });

  it('uses the build base for the rewritten URL', () => {
    const rewritten: string[] = [];
    restorePublicPathIntoHash(
      { pathname: '/docforum-web/for-doctors', hash: '', search: '' },
      (url) => rewritten.push(url),
      '/docforum-web/',
    );
    expect(rewritten).toEqual(['/docforum-web/#/for-doctors']);
  });

  it('leaves URLs alone when a hash is already present', () => {
    const rewritten: string[] = [];
    const restored = restorePublicPathIntoHash(
      { pathname: '/faq/', hash: '#/patient', search: '' },
      (url) => rewritten.push(url),
      '/',
    );
    expect(restored).toBe(false);
    expect(rewritten).toEqual([]);
  });

  it('leaves non-public paths alone', () => {
    const rewritten: string[] = [];
    const restored = restorePublicPathIntoHash(
      { pathname: '/login', hash: '', search: '' },
      (url) => rewritten.push(url),
      '/',
    );
    expect(restored).toBe(false);
    expect(rewritten).toEqual([]);
  });
});
