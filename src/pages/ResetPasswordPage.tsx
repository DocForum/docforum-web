import { useEffect, useState } from 'react';
import { FormProvider } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { paths } from '../routes/paths';
import { Button } from '../components/Button';
import { FormError } from '../components/FormError';
import { FormField } from '../components/form/FormField';
import { useZodForm } from '../hooks/useZodForm';
import { ApiError } from '../services/api-client';
import { confirmPasswordReset } from '../services/auth-service';
import { useAuthStore } from '../store/auth-store';

const passwordSchema = z.object({
  newPassword: z.string().min(1, 'Password is required.').min(8, 'Password must be at least 8 characters.'),
});

type PasswordForm = z.infer<typeof passwordSchema>;

export function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [token] = useState(() => new URLSearchParams(location.search).get('token'));
  const form = useZodForm(passwordSchema, { newPassword: '' });
  const [error, setError] = useState<string | null>(null);
  const [invalidLink, setInvalidLink] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!token) return;
    const params = new URLSearchParams(location.search);
    if (!params.has('token')) return;
    params.delete('token');
    navigate(
      { pathname: location.pathname, search: params.size > 0 ? `?${params.toString()}` : '' },
      { replace: true },
    );
  }, [location.pathname, location.search, navigate, token]);

  async function onSubmit({ newPassword }: PasswordForm) {
    if (!token) return;
    setPending(true);
    setError(null);
    try {
      await confirmPasswordReset(token, newPassword);
      useAuthStore.getState().clearSession();
      navigate(paths.login, { replace: true, state: { passwordResetComplete: true } });
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 400) {
        setInvalidLink(true);
        setError('This link is invalid or has expired.');
      } else {
        setError(reason instanceof Error ? reason.message : 'Could not reset your password. Try again.');
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <FormProvider {...form}>
      <div className="authContainer">
        <div className="card">
          <h1>Reset your password</h1>
          {!token ? (
            <>
              <p role="alert">This reset link is invalid or missing its token.</p>
              <Link to={paths.forgotPassword}>Request a new reset link</Link>
            </>
          ) : invalidLink ? (
            <>
              <FormError message={error} />
              <Link to={paths.forgotPassword}>Request a new reset link</Link>
            </>
          ) : (
            <>
              <p>Choose a new password with at least 8 characters.</p>
              <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
                <FormError message={error} />
                <FormField name="newPassword" label="New password" type="password" autoComplete="new-password" />
                <Button type="submit" loading={pending}>Update password</Button>
              </form>
            </>
          )}
        </div>
      </div>
    </FormProvider>
  );
}
