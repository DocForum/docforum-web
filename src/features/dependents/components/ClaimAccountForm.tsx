import { type FormEvent, useState } from 'react';
import { TextField } from '../../../components/TextField';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { useT } from '../../../i18n/useT';
import { useErrorMessage } from '../../../hooks/useErrorText';
import { useMutation } from '@tanstack/react-query';
import * as dependentsService from '../../../services/dependents-service';
import styles from './ClaimAccountForm.module.css';

interface Props {
  token: string;
}

export function ClaimAccountForm({ token }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const t = useT();
  const errorMessage = useErrorMessage();

  const claimMutation = useMutation({
    mutationFn: (input: dependentsService.ClaimAccountInput) => dependentsService.claimAccount(input),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!email.trim()) errors.email = t('claim.emailRequired', 'Email is required.');
    if (password.length < 8) errors.password = t('claim.passwordMin', 'Password must be at least {min} characters.', { min: 8 });
    if (password !== confirmPassword) errors.confirmPassword = t('claim.passwordMismatch', 'Passwords do not match.');
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    claimMutation.mutate({ token, email: email.trim(), password });
  }

  if (claimMutation.isSuccess) {
    return (
      <div className={styles.success}>
        <h1>{t('claim.successTitle', 'Account claimed')}</h1>
        <p>{t('claim.successBody', 'Your account is set up. You can now log in with your email and password.')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h1 className={styles.title}>{t('claim.title', 'Claim your account')}</h1>
      <p className={styles.description}>
        {t('claim.description', 'Your guardian has invited you to take over your health record. Set up your login below.')}
      </p>
      <TextField
        label={t('claim.email', 'Email')}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldErrors.email}
        required
      />
      <TextField
        label={t('claim.password', 'Password')}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldErrors.password}
        required
      />
      <TextField
        label={t('claim.confirmPassword', 'Confirm password')}
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        error={fieldErrors.confirmPassword}
        required
      />
      <FormError message={errorMessage(claimMutation.error)} />
      <Button type="submit" loading={claimMutation.isPending}>
        {t('claim.submit', 'Claim account')}
      </Button>
    </form>
  );
}
