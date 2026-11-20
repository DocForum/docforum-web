import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToString } from 'react-dom/server';
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
} from 'react-router-dom';
import { createAppRoutes } from '../routes';

/**
 * Build-time only (issue #120). Renders the real app — real route table,
 * real Layout, real page components — for one public route, with no
 * session: `auth-store` is in memory and starts empty, so only the
 * logged-out branch of every auth-aware component can execute, and no
 * authenticated code path runs during prerendering.
 *
 * Uses React Router's static data APIs (issue #112): `query()` resolves the
 * matched lazy route modules and runs their loaders (public pages have
 * none), then the static router renders the result. `hydrate={false}`
 * because the client boots with `createRoot`, not hydration — and so the
 * markup carries no inline `<script>` (strict CSP, issue #101).
 *
 * Never imported by `src/main.tsx`; built to `dist-ssr/` (git-ignored,
 * not part of the Pages artifact) by `npm run prerender`.
 */
export async function renderPublicPage(path: string): Promise<string> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const routes = createAppRoutes({ queryClient });
  const handler = createStaticHandler(routes);
  const context = await handler.query(new Request(new URL(path, 'http://prerender.local')));
  if (context instanceof Response) {
    throw new Error(`Prerender of ${path} redirected (status ${context.status})`);
  }
  const router = createStaticRouter(handler.dataRoutes, context);

  return renderToString(
    <QueryClientProvider client={queryClient}>
      <StaticRouterProvider router={router} context={context} hydrate={false} />
    </QueryClientProvider>,
  );
}

/** The `base` this build ran with (`/` or `/docforum-web/`). */
export const BUILD_BASE = import.meta.env.BASE_URL;

export {
  PUBLIC_PAGES,
  buildRobots,
  buildSitemap,
  canonicalUrl,
  publicPageByPath,
} from '../pages/public-routes';
export { applyHeadMeta, injectAppHtml, prerenderPage, rewriteInternalLinks, validatePrerenderedHtml } from './html';
