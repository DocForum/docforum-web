import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

/**
 * Build-time only (issue #120). Renders the real app — real route table,
 * real Layout, real page components — for one public route, with no
 * session: `auth-store` is in memory and starts empty, so only the
 * logged-out branch of every auth-aware component can execute, and no
 * authenticated code path runs during prerendering.
 *
 * Never imported by `src/main.tsx`; built to `dist-ssr/` (git-ignored,
 * not part of the Pages artifact) by `npm run prerender`.
 */
export function renderPublicPage(path: string): string {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return renderToString(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
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
