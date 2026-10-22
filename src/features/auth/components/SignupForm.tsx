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
        setServerError(error.message ?? 'Something went wrong. Please try again.');
      } else {
        setServerError('Something went wrong. Please try again.');
      }
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
            Still working — the server may be waking up after being idle. This can take up to a
            minute.
          </p>
        )}
        <RoleSelect value={role} onChange={setRole} />
        <FormField name="fullName" label="Full name" autoComplete="name" />
        <FormField name="email" label="Email" type="email" autoComplete="email" />
        <FormField
          name="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
        />
        <Button type="submit" loading={signupMutation.isPending}>
          {signupMutation.isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </FormProvider>
  );
}
