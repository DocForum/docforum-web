import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../services/api-client';
import { verifyEmail } from '../services/auth-service';
import { useAuthStore } from '../store/auth-store';
import { ResendVerificationButton } from '../features/auth/components/ResendVerificationButton';

type VerificationState =
  | { status: 'checking' }
  | { status: 'success' }
  | { status: 'invalid' }
  | { status: 'expired' }
  | { status: 'error' };

function apiErrorCode(error: unknown): string | undefined {
  if (!(error instanceof ApiError) || typeof error.body !== 'object' || error.body === null) {
    return undefined;
  }
  const code = Reflect.get(error.body, 'code');
  return typeof code === 'string' ? code : undefined;
}

export function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const hasTokenParam = new URLSearchParams(location.search).has('token');
  const [token] = useState(() => new URLSearchParams(location.search).get('token'));
  const [state, setState] = useState<VerificationState>(() =>
    token ? { status: 'checking' } : { status: 'invalid' },
  );
  const attempt = useRef<{ token: string; promise: ReturnType<typeof verifyEmail> } | null>(null);
  const user = useAuthStore((current) => current.user);
  const userRef = useRef(user);
  userRef.current = user;
  const markEmailVerified = useAuthStore((current) => current.markEmailVerified);

  useEffect(() => {
    if (hasTokenParam) {
      navigate(
        { pathname: location.pathname, search: '', hash: location.hash },
        { replace: true },
      );
    }
    if (!token) return;

    let active = true;
    if (!attempt.current || attempt.current.token !== token) {
      attempt.current = { token, promise: verifyEmail(token) };
    }
    attempt.current.promise.then(
      (result) => {
        if (!active) return;
        markEmailVerified(result.emailVerifiedAt);
        setState({ status: 'success' });
      },
      (error: unknown) => {
        if (!active) return;
        const code = apiErrorCode(error);
        if (code === 'VERIFICATION_TOKEN_EXPIRED') setState({ status: 'expired' });
        else if (code === 'INVALID_VERIFICATION_TOKEN' && userRef.current?.emailVerifiedAt) {
          setState({ status: 'success' });
        } else if (code === 'INVALID_VERIFICATION_TOKEN') {
          setState({ status: 'invalid' });
        } else {
          setState({ status: 'error' });
        }
      },
    );
    return () => {
      active = false;
    };
  }, [
    hasTokenParam,
    location.hash,
    location.pathname,
    location.search,
    markEmailVerified,
    navigate,
    token,
  ]);

  return (
    <div className="authContainer">
      <section className="card" aria-live="polite">
        <h1>Verify your email</h1>
        {state.status === 'checking' && <p>Checking your verification link…</p>}
        {state.status === 'success' && <p role="status">Your email address is verified.</p>}
        {state.status === 'invalid' && (
          <>
            <p role="alert">This verification link is invalid or has already been used.</p>
            {user ? (
              <ResendVerificationButton
                label="Send a new link"
                onAlreadyVerified={() => setState({ status: 'success' })}
              />
            ) : (
              <p><Link to="/login">Sign in to request a new verification email.</Link></p>
            )}
          </>
        )}
        {state.status === 'expired' && (
          <>
            <p role="alert">This verification link has expired.</p>
            {user ? (
              <ResendVerificationButton
                label="Send a new link"
                onAlreadyVerified={() => setState({ status: 'success' })}
              />
            ) : (
              <p><Link to="/login">Sign in to request a new verification email.</Link></p>
            )}
          </>
        )}
        {state.status === 'error' && (
          <p role="alert">We could not verify your email. Please try the link again.</p>
        )}
      </section>
    </div>
  );
}
