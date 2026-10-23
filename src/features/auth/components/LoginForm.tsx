import { useState } from 'react';
import { FormProvider } from 'react-hook-form';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { Spinner } from '../../../components/Spinner';
import { FormField } from '../../../components/form/FormField';
import { useZodForm } from '../../../hooks/useZodForm';
import { mapServerErrors } from '../../../utils/form';
import { useSlowRequestHint } from '../../../hooks/useSlowRequestHint';
import { useLogin } from '../hooks/useLogin';
import { z } from 'zod';
import { ApiError, RateLimitError } from '../../../services/api-client';
import { useRetryAfterCountdown } from '../../../hooks/useRetryAfterCountdown';
import { LockoutNotice } from './LockoutNotice';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.').min(8, 'Password must be at least 8 characters.'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const form = useZodForm(loginSchema, { email: '', password: '' });
  const loginMutation = useLogin();
  const isSlow = useSlowRequestHint(loginMutation.isPending);
  const [serverError, setServerError] = useState<string | null>(null);
  const lockout = useRetryAfterCountdown();

  async function onSubmit(data: LoginFormData) {
    setServerError(null);
    try {
      await loginMutation.mutateAsync({ email: data.email, password: data.password });
      lockout.reset();
      onSuccess?.();
    } catch (error) {
      // 429 lockout: show a countdown and keep submit disabled until it ends.
      // The message is account-agnostic on purpose — it must not reveal
      // whether the email exists (issue #80).
      if (error instanceof RateLimitError) {
        lockout.start(error.retryAfterSeconds);
        return;
      }
      if (error instanceof ApiError) {
        const fieldErrors = mapServerErrors(error.body);
        if (Object.keys(fieldErrors).length > 0) {
          Object.entries(fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof LoginFormData, { message });
          });
          return;
        }
        setServerError(error.message ?? 'Something went wrong. Please try again.');
      } else {
        setServerError('Something went wrong. Please try again.');
      }
    }
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        {lockout.isLockedOut && <LockoutNotice secondsRemaining={lockout.secondsRemaining} />}
        <FormError message={serverError} />
        {isSlow && (
          <p className="slowHint" role="status">
            <Spinner size={14} />
            Still working — the server may be waking up after being idle. This can take up to a
            minute.
          </p>
        )}
        <FormField name="email" label="Email" type="email" autoComplete="email" />
        <FormField name="password" label="Password" type="password" autoComplete="current-password" />
        <Button
          type="submit"
          loading={loginMutation.isPending}
          disabled={lockout.isLockedOut}
        >
          {loginMutation.isPending ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
    </FormProvider>
  );
}
