import { useEffect, useRef, useState } from 'react';
import { FormProvider } from 'react-hook-form';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { Spinner } from '../../../components/Spinner';
import { RoleSelect } from './RoleSelect';
import { FormField } from '../../../components/form/FormField';
import { useZodForm } from '../../../hooks/useZodForm';
import { mapServerErrors } from '../../../utils/form';
import { useSlowRequestHint } from '../../../hooks/useSlowRequestHint';
import { useT } from '../../../i18n/useT';
import { useErrorMessage } from '../../../hooks/useErrorText';
import { useSignup } from '../hooks/useSignup';
import { z } from 'zod';
import { ApiError } from '../../../services/api-client';
import type { SelfServeRole } from '../../../types/models';

const signupSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required.'),
  email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.').min(8, 'Password must be at least 8 characters.'),
});

type SignupFormData = z.infer<typeof signupSchema>;

export interface SignupFormProps {
  onSuccess?: () => void;
}

export function SignupForm({ onSuccess }: SignupFormProps) {
  const [role, setRole] = useState<SelfServeRole>('patient');
  const form = useZodForm(signupSchema, { fullName: '', email: '', password: '' });
  const signupMutation = useSignup();
  const isSlow = useSlowRequestHint(signupMutation.isPending);
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

  async function onSubmit(data: SignupFormData) {
    setServerError(null);
    try {
      await signupMutation.mutateAsync({ role, ...data });
      onSuccess?.();
    } catch (error) {
      if (error instanceof ApiError) {
        const fieldErrors = mapServerErrors(error.body);
        if (Object.keys(fieldErrors).length > 0) {
          Object.entries(fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof SignupFormData, { message });
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
        {signupMutation.isPending && (
          <p className="srOnly" role="status">
            Creating your account. Please wait.
          </p>
        )}
        {isSlow && (
          <p className="slowHint" role="status">
            <Spinner size={14} />
            {t('auth.slowHint', 'Still working — the server may be waking up after being idle. This can take up to a minute.')}
          </p>
        )}
        <RoleSelect value={role} onChange={setRole} />
        <FormField name="fullName" label={t('auth.fullName', 'Full name')} autoComplete="name" />
        <FormField name="email" label={t('auth.email', 'Email')} type="email" autoComplete="email" />
        <FormField
          name="password"
          label={t('auth.password', 'Password')}
          type="password"
          autoComplete="new-password"
          hint={t('auth.passwordHint', 'At least 8 characters.')}
        />
        <Button type="submit" loading={signupMutation.isPending}>
          {signupMutation.isPending ? t('auth.creatingAccount', 'Creating account…') : t('auth.createAccount', 'Create account')}
        </Button>
      </form>
    </FormProvider>
  );
}
