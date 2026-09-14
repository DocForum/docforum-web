import { useState } from 'react';
import type { FormEvent } from 'react';
import { TextField } from '../../../components/TextField';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { RoleSelect } from './RoleSelect';
import { useSignup } from '../hooks/useSignup';
import { validateEmail, validateFullName, validatePassword, type FieldErrors } from '../validation';
import { ApiError } from '../../../services/api-client';
import type { SelfServeRole } from '../../../types/models';

export interface SignupFormProps {
  onSuccess?: () => void;
}

export function SignupForm({ onSuccess }: SignupFormProps) {
  const [role, setRole] = useState<SelfServeRole>('patient');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const signupMutation = useSignup();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors: FieldErrors = {
      fullName: validateFullName(fullName),
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setFieldErrors(errors);
    if (errors.fullName || errors.email || errors.password) return;

    signupMutation.mutate({ role, fullName, email, password }, { onSuccess });
  }

  const submitError =
    signupMutation.error instanceof ApiError
      ? signupMutation.error.message
      : signupMutation.error
        ? 'Something went wrong. Please try again.'
        : null;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FormError message={submitError} />
      <RoleSelect value={role} onChange={setRole} />
      <TextField
        label="Full name"
        autoComplete="name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        error={fieldErrors.fullName}
      />
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldErrors.email}
      />
      <TextField
        label="Password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldErrors.password}
      />
      <Button type="submit" disabled={signupMutation.isPending}>
        {signupMutation.isPending ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
