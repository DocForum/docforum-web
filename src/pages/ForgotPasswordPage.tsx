import { useEffect, useState } from 'react';
import { FormProvider } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { paths } from '../routes/paths';
import { Button } from '../components/Button';
import { FormError } from '../components/FormError';
import { FormField } from '../components/form/FormField';
import { useZodForm } from '../hooks/useZodForm';
import { useSlowRequestHint } from '../hooks/useSlowRequestHint';
import { requestPasswordReset } from '../services/auth-service';
import { RateLimitError } from '../services/api-client';

const requestSchema = z.object({
  email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.'),
});

type RequestForm = z.infer<typeof requestSchema>;

export function ForgotPasswordPage() {
  const form = useZodForm(requestSchema, { email: '' });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const isSlow = useSlowRequestHint(pending);

  useEffect(() => {
    if (retryAfter <= 0) return undefined;
    const timer = window.setTimeout(() => setRetryAfter((remaining) => Math.max(0, remaining - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [retryAfter]);

  async function onSubmit({ email }: RequestForm) {
    setError(null);
    setPending(true);
    try {
      await requestPasswordReset(email);
      setSubmitted(true);
    } catch (reason) {
      if (reason instanceof RateLimitError) {
        setError('Too many reset requests. Please wait before trying again.');
        setRetryAfter(reason.retryAfterSeconds);
      } else {
        setError(reason instanceof Error ? reason.message : 'Could not submit the request. Try again.');
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <FormProvider {...form}>
      <div className="authContainer">
        <div className="card">
          <h1>Forgot password?</h1>
          {submitted ? (
            <p role="status">
              If an account exists for that email, a password reset link is on its way.
            </p>
          ) : (
            <>
              <p>Enter your email address and we’ll send a link to reset your password.</p>
              <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
                <FormError message={error} />
                {isSlow && <p role="status">The server may be waking up. This can take up to a minute.</p>}
                {retryAfter > 0 && <p role="status">Try again in {retryAfter} seconds.</p>}
                <FormField name="email" label="Email" type="email" autoComplete="email" />
                <Button type="submit" loading={pending} disabled={retryAfter > 0}>
                  Send reset link
                </Button>
              </form>
            </>
          )}
          <p><Link to={paths.login}>Back to sign in</Link></p>
        </div>
      </div>
    </FormProvider>
  );
}
