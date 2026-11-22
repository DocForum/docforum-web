import { Spinner } from './Spinner';
import { useSlowRequestHint } from '../hooks/useSlowRequestHint';
import { useOptionalT } from '../i18n/useOptionalT';
import { useAuthStore } from '../store/auth-store';

/**
 * Shown in place of a guarded route while its loader runs on first load
 * (the route's `HydrateFallback`, issue #112). On a reload that is almost
 * always the boot session restore (issue #9) — a cold-started Render
 * instance can take up to a minute — so it says so, with the same slow-hint
 * copy `RequireAuth` used. Once the session is known it is just a short
 * loading state while the page chunk and its data arrive.
 *
 * Reserves the same block a page header + first card would take, so the
 * swap to real content does not shift the footer (CLS budget, issue #99).
 */
export function SessionRestoring() {
  const { t } = useOptionalT();
  const status = useAuthStore((state) => state.status);
  const isResolving = status === 'resolving';
  const isSlow = useSlowRequestHint(isResolving);

  return (
    <div role="status" aria-live="polite" className="card routeFallback">
      <p>
        <Spinner size={14} />{' '}
        {isResolving
          ? t('shell.auth.restoring', 'Restoring your session…')
          : t('shell.auth.loading', 'Loading…')}
      </p>
      {isSlow && (
        <p className="slowHint">
          {t(
            'auth.slowHint',
            'Still working — the server may be waking up after being idle. This can take up to a minute.',
          )}
        </p>
      )}
    </div>
  );
}
