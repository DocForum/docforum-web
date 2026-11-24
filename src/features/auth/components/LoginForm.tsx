import { useEffect, useRef, useState } from 'react';
import { FormProvider } from 'react-hook-form';
import QRCode from 'qrcode';
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
import { RecoveryCodeActions } from './RecoveryCodeActions';
import { enableTwoFactor, isAuthSession, setupTwoFactor, verifyTwoFactor } from '../../../services/auth-service';
import { useAuthStore } from '../../../store/auth-store';
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
type Challenge =
  | { kind: 'mfa'; token: string }
  | { kind: 'enrollment'; token: string };

export function LoginForm({ onSuccess }: LoginFormProps) {
  const form = useZodForm(loginSchema, { email: '', password: '' });
  const loginMutation = useLogin();
  const lockout = useRetryAfterCountdown();
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
        if (error.status === 429) {
          setServerError('Too many sign-in attempts. Please wait before trying again.');
          setLockoutSeconds(error.retryAfterSeconds ?? 0);
          return;
        }
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

  if (challenge?.kind === 'mfa') {
    return (
      <MfaChallenge
        token={challenge.token}
        onBack={() => setChallenge(null)}
        onExpired={() => {
          setChallenge(null);
          form.reset({ email: '', password: '' });
          setServerError('Your sign-in step expired. Enter your password again to request a new code.');
        }}
        onSuccess={onSuccess}
      />
    );
  }

  if (challenge?.kind === 'enrollment') {
    return (
      <ForcedEnrollment
        token={challenge.token}
        onExpired={() => {
          setChallenge(null);
          form.reset({ email: '', password: '' });
          setServerError('Your enrolment step expired. Enter your password again to restart sign-in.');
        }}
        onFinished={() => {
          setChallenge(null);
          form.reset({ email: '', password: '' });
          setServerError('Two-factor authentication is enabled. Sign in again with your password and authenticator code.');
        }}
      />
    );
  }

  return (
    <FormProvider {...form}>
      <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FormError message={serverError} />
        {lockout.isLockedOut && <LockoutNotice secondsRemaining={lockout.secondsRemaining} />}
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
        <Button type="submit" loading={loginMutation.isPending} disabled={lockout.isLockedOut}>
          {loginMutation.isPending ? t('auth.loggingIn', 'Logging in…') : t('auth.logIn', 'Log in')}
        </Button>
      </form>
    </FormProvider>
  );
}

function normalizedCode(value: string): string {
  return value.replace(/\s+/g, '').trim().toUpperCase();
}

function errorCode(error: unknown): string | undefined {
  if (!(error instanceof ApiError) || typeof error.body !== 'object' || error.body === null) return undefined;
  const code = (error.body as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

function MfaChallenge({
  token,
  onBack,
  onExpired,
  onSuccess,
}: {
  token: string;
  onBack: () => void;
  onExpired: () => void;
  onSuccess?: () => void;
}) {
  const setSession = useAuthStore((state) => state.setSession);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const session = await verifyTwoFactor(token, normalizedCode(code));
      setSession(session.user, session.accessToken);
      onSuccess?.();
    } catch (reason) {
      if (errorCode(reason) === 'INVALID_MFA_TOKEN') {
        onExpired();
      } else if (errorCode(reason) === 'INVALID_TOTP_CODE') {
        setError('That code is incorrect or has already been used. Try a new code or recovery code.');
      } else {
        setError(reason instanceof Error ? reason.message : 'Could not verify the code. Try again.');
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <h2>Two-factor sign-in</h2>
      <p>Enter a six-digit authenticator code or one of your recovery codes.</p>
      {error && <FormError message={error} />}
      <label htmlFor="mfa-code">Authenticator or recovery code</label>
      <input
        id="mfa-code"
        name="code"
        type="text"
        autoComplete="one-time-code"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        autoFocus
        required
      />
      <Button type="submit" loading={pending} disabled={!normalizedCode(code)}>
        Verify and sign in
      </Button>
      <Button type="button" variant="secondary" onClick={onBack}>
        Back to password
      </Button>
    </form>
  );
}

function ForcedEnrollment({
  token,
  onExpired,
  onFinished,
}: {
  token: string;
  onExpired: () => void;
  onFinished: () => void;
}) {
  const setupPromise = useRef<Promise<{ secret: string; qrCode: string }> | null>(null);
  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;
  const [setup, setSetup] = useState<{ secret: string; qrCode: string } | null>(null);
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!setupPromise.current) {
      setupPromise.current = setupTwoFactor(token).then(async (response) => ({
        secret: response.secret,
        qrCode: await QRCode.toDataURL(response.otpauthUri),
      }));
    }
    let active = true;
    void setupPromise.current
      .then((response) => {
        if (active) setSetup(response);
      })
      .catch((reason: unknown) => {
        if (active) {
          if (errorCode(reason) === 'INVALID_MFA_TOKEN') onExpiredRef.current();
          else setError(reason instanceof Error ? reason.message : 'Could not load authenticator setup.');
        }
      });
    return () => {
      active = false;
    };
  }, [token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await enableTwoFactor(token, normalizedCode(code));
      setRecoveryCodes(result.recoveryCodes);
    } catch (reason) {
      if (errorCode(reason) === 'INVALID_MFA_TOKEN') onExpired();
      else if (reason instanceof ApiError && reason.status === 400) setError('That code is incorrect. Check your authenticator app and try again.');
      else setError(reason instanceof Error ? reason.message : 'Could not enable two-factor authentication.');
    } finally {
      setPending(false);
    }
  }

  if (recoveryCodes) {
    return (
      <section>
        <h2>Save your recovery codes</h2>
        <p>These codes are shown once. Store them somewhere safe; each can only be used once.</p>
        <ol>{recoveryCodes.map((recoveryCode) => <li key={recoveryCode}><code>{recoveryCode}</code></li>)}</ol>
        <RecoveryCodeActions codes={recoveryCodes} />
        <Button type="button" onClick={onFinished}>Continue to sign in</Button>
      </section>
    );
  }

  return (
    <section>
      <h2>Set up two-factor authentication</h2>
      <p>Scan this QR code with an authenticator app, or enter the secret manually.</p>
      {error && <FormError message={error} />}
      {setup ? (
        <>
          <img src={setup.qrCode} alt="Authenticator app setup QR code" width="220" height="220" />
          <p>Setup key: <code>{setup.secret}</code></p>
          <form onSubmit={submit} noValidate>
            <label htmlFor="enrollment-code">Six-digit authenticator code</label>
            <input id="enrollment-code" type="text" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} required />
            <Button type="submit" loading={pending} disabled={!normalizedCode(code)}>Enable and show recovery codes</Button>
          </form>
        </>
      ) : (
        <p role="status">Preparing your authenticator setup…</p>
      )}
    </section>
  );
}
