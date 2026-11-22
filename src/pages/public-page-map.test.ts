import { describe, expect, it } from 'vitest';
import { PUBLIC_PAGES } from './public-routes';
import { PUBLIC_CONTENT_ROUTES, publicPageLoader } from './public-page-map';

describe('public page component map', () => {
  it('has a component for every registered public page', () => {
    for (const page of PUBLIC_PAGES) {
      expect(() => publicPageLoader(page.path), page.path).not.toThrow();
    }
  });

  it('resolves each loader to a renderable component', async () => {
    for (const page of PUBLIC_PAGES) {
      const Component = await publicPageLoader(page.path)();
      expect(typeof Component, page.path).toBe('function');
    }
  });

  it('throws for paths that are not registered public pages', () => {
    expect(() => publicPageLoader('/patient')).toThrow(/No component registered/);
  });

  it('exposes every public content route (all but the index) to the router', () => {
    expect(PUBLIC_CONTENT_ROUTES.map((route) => route.path)).toEqual([
      'how-it-works',
      'for-doctors',
      'for-facilities',
      'privacy',
      'accessibility',
      'faq',
    ]);
  });

  it('keeps route paths and registry paths in agreement', () => {
    const registryContentPaths = PUBLIC_PAGES.filter((page) => page.path !== '/').map((page) =>
      page.path.replace(/^\//, ''),
    );
    expect(PUBLIC_CONTENT_ROUTES.map((route) => route.path)).toEqual(registryContentPaths);
  });
});
