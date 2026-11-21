import { Outlet } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { I18nProvider } from './i18n/I18nProvider';
import { HashRedirectShim } from './components/HashRedirectShim';
import { ToastRegion } from './components/Toast';
import { useAnalyticsPageview } from './hooks/useAnalyticsPageview';
import { UpdatePromptContainer } from './pwa/UpdatePromptContainer';

const useHashRouter = import.meta.env.VITE_USE_HASH_ROUTER === 'true';

/**
 * The root route's element (issue #112): app-wide providers and chrome that
 * need router context. The route table itself lives in `src/routes/` and is
 * mounted by a data router in `src/main.tsx`.
 */
export default function App() {
  useAnalyticsPageview();

  return (
    <I18nProvider>
      <ErrorBoundary level="app">
        <>
          {!useHashRouter && <HashRedirectShim />}
          <Outlet />
          <UpdatePromptContainer />
          {/* Toasts for background mutation results (issue #113). */}
          <ToastRegion />
        </>
      </ErrorBoundary>
    </I18nProvider>
  );
}
