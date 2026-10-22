import type { ComponentType } from 'react';
import { HomePage } from './HomePage';
import { HowItWorksPage } from './HowItWorksPage';
import { ForDoctorsPage } from './ForDoctorsPage';
import { ForFacilitiesPage } from './ForFacilitiesPage';
import { PrivacyPage } from './PrivacyPage';
import { AccessibilityPage } from './AccessibilityPage';
import { FaqPage } from './FaqPage';
import { PUBLIC_PAGES } from './public-routes';

/**
 * Path → component for every prerendered public page, in one place, so the
 * router (`App.tsx`) and the build-time prerender entry
 * (`src/prerender/entry-server.tsx`) cannot drift apart. A test asserts
 * every path in `PUBLIC_PAGES` has a component here.
 */
const COMPONENT_BY_PATH: Record<string, ComponentType> = {
  '/': HomePage,
  '/how-it-works': HowItWorksPage,
  '/for-doctors': ForDoctorsPage,
  '/for-facilities': ForFacilitiesPage,
  '/privacy': PrivacyPage,
  '/accessibility': AccessibilityPage,
  '/faq': FaqPage,
};

export function publicPageComponent(path: string): ComponentType {
  const component = COMPONENT_BY_PATH[path];
  if (!component) {
    throw new Error(`No component registered for public page "${path}"`);
  }
  return component;
}

/**
 * The public content routes `App.tsx` mounts under the layout, beside its
 * explicit index (landing) route. `path` is relative to the layout route,
 * the way nested `<Route>`s are written in this repo.
 */
export const PUBLIC_CONTENT_ROUTES: ReadonlyArray<{ path: string; Component: ComponentType }> =
  PUBLIC_PAGES.filter((page) => page.path !== '/').map((page) => ({
    path: page.path.slice(1),
    Component: publicPageComponent(page.path),
  }));
