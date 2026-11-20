import { Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { I18nProvider } from './i18n/I18nProvider';
import { HashRedirectShim } from './components/HashRedirectShim';
import { useAnalyticsPageview } from './hooks/useAnalyticsPageview';
import { Layout } from './components/Layout';
import { NotFoundPage } from './pages/NotFoundPage';
import { UpdatePromptContainer } from './pwa/UpdatePromptContainer';
import { adminRoutes } from './routes/admin';
import { doctorRoutes } from './routes/doctor';
import { facilityRoutes } from './routes/facility';
import { patientRoutes } from './routes/patient';
import { publicRoutes } from './routes/public';

const useHashRouter = import.meta.env.VITE_USE_HASH_ROUTER === 'true';

export default function App() {
  useAnalyticsPageview();

  return (
    <I18nProvider>
      <ErrorBoundary level="app">
        <>
          {!useHashRouter && <HashRedirectShim />}
          <Routes>
      <Route element={<Layout />}>
        {/* One file per area in src/routes/. */}
        {publicRoutes}
        {patientRoutes}
        {doctorRoutes}
        {facilityRoutes}
        {adminRoutes}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
          </Routes>
          <UpdatePromptContainer />
        </>
      </ErrorBoundary>
    </I18nProvider>
  );
}
