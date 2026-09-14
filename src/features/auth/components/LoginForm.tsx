import { useState } from 'react';
import type { FormEvent } from 'react';
import { TextField } from '../../../components/TextField';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { Spinner } from '../../../components/Spinner';
import { useLogin } from '../hooks/useLogin';
import { useSlowRequestHint } from '../../../hooks/useSlowRequestHint';
import { validateEmail, validatePassword, type FieldErrors } from '../validation';
import { ApiError } from '../../../services/api-client';

export interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const loginMutation = useLogin();
  const isSlow = useSlowRequestHint(loginMutation.isPending);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors: FieldErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setFieldErrors(errors);
    if (errors.email || errors.password) return;

    loginMutation.mutate({ email, password }, { onSuccess });
  }

  const submitError =
    loginMutation.error instanceof ApiError
      ? loginMutation.error.message
      : loginMutation.error
        ? 'Something went wrong. Please try again.'
        : null;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FormError message={submitError} />
      {isSlow && (
        <p className="slowHint" role="status">
          <Spinner size={14} />
          Still working — the server may be waking up after being idle. This can take up to a
          minute.
        </p>
      )}
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
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldErrors.password}
      />
      <Button type="submit" loading={loginMutation.isPending}>
        {loginMutation.isPending ? 'Logging in…' : 'Log in'}
      </Button>
    </form>
  );
}
