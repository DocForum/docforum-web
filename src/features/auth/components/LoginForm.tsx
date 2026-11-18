import { useEffect, useRef, useState } from 'react';
import { FormProvider } from 'react-hook-form';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { Spinner } from '../../../components/Spinner';
import { FormField } from '../../../components/form/FormField';
import { useZodForm } from '../../../hooks/useZodForm';
import { mapServerErrors } from '../../../utils/form';
import { useSlowRequestHint } from '../../../hooks/useSlowRequestHint';
import { useT } from '../../../i18n/useT';
import { useErrorMessage } from '../../../hooks/useErrorText';
import { useLogin } from '../hooks/useLogin';
import { z } from 'zod';
import { ApiError } from '../../../services/api-client';

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
  const t = useT();
  const errorMessage = useErrorMessage();
  const [serverError, setServerError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const { errors } = form.formState;

  // Move focus to the first problem after a failed submit so keyboard and
  // screen-reader users do not have to hunt through the form.
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }
  }, [errors]);

  async function onSubmit(data: LoginFormData) {
    setServerError(null);
    try {
      await loginMutation.mutateAsync({ email: data.email, password: data.password });
      onSuccess?.();
    } catch (error) {
      if (error instanceof ApiError) {
        const fieldErrors = mapServerErrors(error.body);
        if (Object.keys(fieldErrors).length > 0) {
          Object.entries(fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof LoginFormData, { message });
          });
          return;
        }
      }
      setServerError(errorMessage(error));
    }
  }

  return (
    <FormProvider {...form}>
      <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FormError message={serverError} />
        {loginMutation.isPending && (
          <p className="srOnly" role="status">
            Logging in. Please wait.
          </p>
        )}
        {isSlow && (
          <p className="slowHint" role="status">
            <Spinner size={14} />
            {t('auth.slowHint', 'Still working — the server may be waking up after being idle. This can take up to a minute.')}
          </p>
        )}
        <FormField name="email" label={t('auth.email', 'Email')} type="email" autoComplete="email" />
        <FormField
          name="password"
          label={t('auth.password', 'Password')}
          type="password"
          autoComplete="current-password"
        />
        <Button type="submit" loading={loginMutation.isPending}>
          {loginMutation.isPending ? t('auth.loggingIn', 'Logging in…') : t('auth.logIn', 'Log in')}
        </Button>
      </form>
    </FormProvider>
  );
}
