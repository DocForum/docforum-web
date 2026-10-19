import { useState } from 'react';
import type { FormEvent } from 'react';
import { TextField } from '../../../components/TextField';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { Spinner } from '../../../components/Spinner';
import { useLogin } from '../hooks/useLogin';
import { useSlowRequestHint } from '../../../hooks/useSlowRequestHint';
import { validateEmail, validatePassword, type FieldErrors } from '../validation';
import { useT } from '../../../i18n/useT';
import { useErrorMessage } from '../../../hooks/useErrorText';

export interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const loginMutation = useLogin();
  const isSlow = useSlowRequestHint(loginMutation.isPending);
  const t = useT();
  const errorMessage = useErrorMessage();

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

  const submitError = errorMessage(loginMutation.error);

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FormError message={submitError} />
      {isSlow && (
        <p className="slowHint" role="status">
          <Spinner size={14} />
          {t('auth.slowHint', 'Still working — the server may be waking up after being idle. This can take up to a minute.')}
        </p>
      )}
      <TextField
        label={t('auth.email', 'Email')}
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldErrors.email}
      />
      <TextField
        label={t('auth.password', 'Password')}
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldErrors.password}
      />
      <Button type="submit" loading={loginMutation.isPending}>
        {loginMutation.isPending ? t('auth.loggingIn', 'Logging in…') : t('auth.logIn', 'Log in')}
      </Button>
    </form>
  );
}
