import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { ErrorFallback, type ErrorBoundaryLevel } from './ErrorBoundary';
import { NotFoundPage } from '../pages/NotFoundPage';

/**
 * The `errorElement` for each route section (issue #112). React Router
 * renders it in place of the section when its loader, its lazy module or its
 * component throws, so a failure stays inside the layout's `<main>` and the
 * navigation remains usable — the same containment the route-level
 * `ErrorBoundary` gives render errors (issue #84), reusing its copy.
 *
 * "Try again" reloads the page: for the errors that reach here (a failed
 * chunk download, a loader that threw) a reload is the reliable recovery.
 */
export function RouteErrorElement({ level = 'route' }: { level?: ErrorBoundaryLevel }) {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;

  // Logged for support only; the user never sees raw error text.
  console.error(`[RouteError:${level}]`, error);

  return (
    <ErrorFallback
      level={level}
      error={error}
      onReset={() => {
        window.location.reload();
      }}
    />
  );
}
