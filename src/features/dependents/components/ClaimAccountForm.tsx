import { type FormEvent, useState } from 'react';
import { TextField } from '../../../components/TextField';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { ApiError } from '../../../services/api-client';
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

  const claimMutation = useMutation({
    mutationFn: (input: dependentsService.ClaimAccountInput) => dependentsService.claimAccount(input),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!email.trim()) errors.email = 'Email is required.';
    if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
    if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    claimMutation.mutate({ token, email: email.trim(), password });
  }

  if (claimMutation.isSuccess) {
    return (
      <div className={styles.success}>
        <h2>Account claimed</h2>
        <p>Your account is set up. You can now log in with your email and password.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h2 className={styles.title}>Claim your account</h2>
      <p className={styles.description}>
        Your guardian has invited you to take over your health record. Set up your login below.
      </p>
      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldErrors.email}
        required
      />
      <TextField
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldErrors.password}
        required
      />
      <TextField
        label="Confirm password"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        error={fieldErrors.confirmPassword}
        required
      />
      <FormError
        message={claimMutation.error instanceof ApiError ? claimMutation.error.message : claimMutation.error ? 'Failed to claim account.' : null}
      />
      <Button type="submit" loading={claimMutation.isPending}>
        Claim account
      </Button>
    </form>
  );
}
