import { useEffect, useState } from 'react';
import { ApiError, RateLimitError } from '../../../services/api-client';
import { resendVerificationEmail } from '../../../services/auth-service';
import { useAuthStore } from '../../../store/auth-store';
import { Button } from '../../../components/Button';

function apiErrorCode(error: unknown): string | undefined {
  return error instanceof ApiError ? (error.code ?? undefined) : undefined;
}

interface ResendVerificationButtonProps {
  label?: string;
  onAlreadyVerified?: () => void;
}

export function ResendVerificationButton({
  label = 'Resend email',
  onAlreadyVerified,
}: ResendVerificationButtonProps) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const markEmailVerified = useAuthStore((state) => state.markEmailVerified);
  const [remaining, setRemaining] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining]);

  async function resend() {
    if (!accessToken || pending || remaining > 0) return;
    setPending(true);
    setError('');
    setMessage('');
    try {
      const result = await resendVerificationEmail(accessToken);
      setRemaining(result.resendAfterSeconds);
      setMessage('Verification email sent. Check your inbox.');
    } catch (reason) {
      if (apiErrorCode(reason) === 'EMAIL_ALREADY_VERIFIED') {
        markEmailVerified(new Date().toISOString());
        setMessage('Your email is already verified.');
        onAlreadyVerified?.();
      } else if (reason instanceof RateLimitError) {
        setRemaining(reason.retryAfterSeconds);
        setError(`Please wait ${reason.retryAfterSeconds} seconds before trying again.`);
      } else {
        setError('We could not send the verification email. Please try again.');
      }
    } finally {
      setPending(false);
    }
  }

  if (!accessToken) return null;

  return (
    <div>
      <Button type="button" variant="secondary" onClick={resend} disabled={pending || remaining > 0}>
        {pending ? 'Sending…' : remaining > 0 ? `${label} (${remaining}s)` : label}
      </Button>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
