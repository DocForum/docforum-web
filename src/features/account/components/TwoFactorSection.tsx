import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import QRCode from 'qrcode';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { ApiError } from '../../../services/api-client';
import {
  disableTwoFactor,
  enableTwoFactor,
  getTwoFactorStatus,
  setupTwoFactor,
} from '../../../services/auth-service';
import type { TwoFactorSetup, TwoFactorStatus } from '../../../types/models';
import { useAuthStore } from '../../../store/auth-store';
import { RecoveryCodeActions } from '../../auth/components/RecoveryCodeActions';

function errorCode(error: unknown): string | undefined {
  if (!(error instanceof ApiError) || typeof error.body !== 'object' || error.body === null) return undefined;
  const code = (error.body as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

function normalizeCode(value: string): string {
  return value.replace(/\s+/g, '').trim().toUpperCase();
}

export function TwoFactorSection() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [setup, setSetup] = useState<(TwoFactorSetup & { qrCode: string }) | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [setupCode, setSetupCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const statusRequest = useRef(0);

  const refreshStatus = useCallback(async () => {
    if (!accessToken) return;
    const requestId = ++statusRequest.current;
    try {
      const next = await getTwoFactorStatus(accessToken);
      if (requestId === statusRequest.current) {
        setStatus(next);
        setError(null);
      }
    } catch (reason) {
      if (requestId === statusRequest.current) {
        setError(reason instanceof Error ? reason.message : 'Could not load two-factor status.');
      }
    } finally {
      if (requestId === statusRequest.current) setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  async function beginSetup() {
    if (!accessToken) return;
    setError(null);
    setPending(true);
    try {
      const response = await setupTwoFactor(accessToken);
      const qrCode = await QRCode.toDataURL(response.otpauthUri);
      setSetup({ ...response, qrCode });
    } catch (reason) {
      if (errorCode(reason) === 'TWO_FACTOR_ALREADY_ENABLED') {
        await refreshStatus();
      } else {
        setError(reason instanceof Error ? reason.message : 'Could not start authenticator setup.');
      }
    } finally {
      setPending(false);
    }
  }

  async function enable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    setError(null);
    setPending(true);
    try {
      const result = await enableTwoFactor(accessToken, normalizeCode(setupCode));
      setRecoveryCodes(result.recoveryCodes);
      setStatus({ enabled: true, unusedRecoveryCodes: result.recoveryCodes.length });
      setSetup(null);
      setSetupCode('');
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 400) {
        setError('That code is incorrect. Check your authenticator app and try again.');
      } else {
        setError(reason instanceof Error ? reason.message : 'Could not enable two-factor authentication.');
      }
    } finally {
      setPending(false);
    }
  }

  async function disable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    setError(null);
    setPending(true);
    try {
      await disableTwoFactor(accessToken, normalizeCode(disableCode));
      setStatus({ enabled: false, unusedRecoveryCodes: 0 });
      setDisableCode('');
      setRecoveryCodes(null);
    } catch (reason) {
      if (errorCode(reason) === 'INVALID_TOTP_CODE') {
        setError('That code is incorrect. Your account is still signed in and two-factor authentication remains enabled.');
      } else {
        setError(reason instanceof Error ? reason.message : 'Could not disable two-factor authentication.');
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="card" aria-labelledby="two-factor-title">
      <h2 id="two-factor-title">Two-factor authentication</h2>
      {error && <FormError message={error} />}
      {loading ? (
        <p role="status">Loading security status…</p>
      ) : status?.enabled ? (
        <>
          <p>Two-factor authentication is on. {status.unusedRecoveryCodes} recovery codes remain unused.</p>
          {recoveryCodes ? (
            <>
              <p>Save these recovery codes now. They will only be shown in this session.</p>
              <ol>{recoveryCodes.map((code) => <li key={code}><code>{code}</code></li>)}</ol>
              <RecoveryCodeActions codes={recoveryCodes} />
              <Button type="button" variant="secondary" onClick={() => setRecoveryCodes(null)}>
                I have saved my codes
              </Button>
            </>
          ) : null}
          <form onSubmit={disable}>
            <label htmlFor="disable-two-factor-code">Code to turn off two-factor authentication</label>
            <input id="disable-two-factor-code" type="text" autoComplete="one-time-code" value={disableCode} onChange={(event) => setDisableCode(event.target.value)} required />
            <Button type="submit" variant="secondary" loading={pending} disabled={!normalizeCode(disableCode)}>
              Turn off two-factor authentication
            </Button>
          </form>
        </>
      ) : setup ? (
        <>
          <p>Scan the QR code with an authenticator app, or enter the secret manually.</p>
          <img src={setup.qrCode} alt="Authenticator app setup QR code" width="220" height="220" />
          <p>Setup key: <code>{setup.secret}</code></p>
          <form onSubmit={enable}>
            <label htmlFor="enable-two-factor-code">Six-digit authenticator code</label>
            <input id="enable-two-factor-code" type="text" autoComplete="one-time-code" value={setupCode} onChange={(event) => setSetupCode(event.target.value)} required />
            <Button type="submit" loading={pending} disabled={!normalizeCode(setupCode)}>
              Enable and show recovery codes
            </Button>
            <Button type="button" variant="secondary" onClick={() => setSetup(null)}>Cancel setup</Button>
          </form>
        </>
      ) : (
        <>
          <p>Protect sign-in with an authenticator app and one-time recovery codes.</p>
          <Button type="button" onClick={() => void beginSetup()} loading={pending}>
            Set up two-factor authentication
          </Button>
        </>
      )}
    </section>
  );
}
