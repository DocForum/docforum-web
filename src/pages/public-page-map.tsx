import type { ComponentType } from 'react';
import { PUBLIC_PAGES } from './public-routes';

type PageLoader = () => Promise<ComponentType>;

/**
 * Path → lazy component loader for every prerendered public page, in one
 * place, so the router (`src/routes/public.tsx`) and the build-time
 * prerender entry (`src/prerender/entry-server.tsx`) cannot drift apart. A
 * test asserts every path in `PUBLIC_PAGES` has a loader here.
 *
 * Loaders, not components (issue #99): each public page is its own chunk,
 * so a signed-in user never downloads marketing copy and a visitor never
 * downloads another public page until they open it.
 */
const LOADER_BY_PATH: Record<string, PageLoader> = {
  '/': () => import('./HomePage').then((m) => m.HomePage),
  '/how-it-works': () => import('./HowItWorksPage').then((m) => m.HowItWorksPage),
  '/for-doctors': () => import('./ForDoctorsPage').then((m) => m.ForDoctorsPage),
  '/for-facilities': () => import('./ForFacilitiesPage').then((m) => m.ForFacilitiesPage),
  '/privacy': () => import('./PublicPrivacyPage').then((m) => m.PublicPrivacyPage),
  '/accessibility': () =>
    import('./AccessibilityStatementPage').then((m) => m.AccessibilityStatementPage),
  '/faq': () => import('./FaqPage').then((m) => m.FaqPage),
};

export function publicPageLoader(path: string): PageLoader {
  const loader = LOADER_BY_PATH[path];
  if (!loader) {
    throw new Error(`No component registered for public page "${path}"`);
  }
  return loader;
}

/**
 * The public content routes mounted under the layout, beside the explicit
 * index (landing) route. `path` is relative to the layout route.
 */
export const PUBLIC_CONTENT_ROUTES: ReadonlyArray<{ path: string; load: PageLoader }> =
  PUBLIC_PAGES.filter((page) => page.path !== '/').map((page) => ({
    path: page.path.slice(1),
    load: publicPageLoader(page.path),
  }));
