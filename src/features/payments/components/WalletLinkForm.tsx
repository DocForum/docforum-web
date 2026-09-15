import { useState } from 'react';
import type { FormEvent } from 'react';
import { TextField } from '../../../components/TextField';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { ApiError } from '../../../services/api-client';
import { useLinkWallet, useOwnWalletLink } from '../hooks/useWalletLink';

const STELLAR_PUBLIC_KEY_PATTERN = /^G[A-Z2-7]{55}$/;

/** Lets a signed-in facility user link the Stellar address docforum-core
 * pays out to on release — see docforum-core's docs/adr/0004. This repo
 * never talks to Stellar directly (hard rule 1); it only ever POSTs a
 * public key string to docforum-core's own API. */
export function WalletLinkForm() {
  const [publicKey, setPublicKey] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const walletQuery = useOwnWalletLink();
  const linkMutation = useLinkWallet();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!STELLAR_PUBLIC_KEY_PATTERN.test(publicKey)) {
      setFieldError('Enter a valid Stellar public key (starts with G, 56 characters).');
      return;
    }
    setFieldError(undefined);
    linkMutation.mutate(publicKey);
  }

  const submitError =
    linkMutation.error instanceof ApiError
      ? linkMutation.error.message
      : linkMutation.error
        ? 'Something went wrong. Please try again.'
        : null;

  const currentWallet = walletQuery.data;
  const hasNoWalletYet = walletQuery.error instanceof ApiError && walletQuery.error.status === 404;

  return (
    <div className="card">
      <h2>Payout wallet</h2>
      {currentWallet ? (
        <p>
          Payments are released to <code>{currentWallet.stellarPublicKey}</code>. Submitting a new
          key below replaces it.
        </p>
      ) : hasNoWalletYet ? (
        <p>No payout wallet linked yet — you won't be able to receive released payments until one is set.</p>
      ) : walletQuery.isLoading ? (
        <p>Loading…</p>
      ) : null}

      <form onSubmit={handleSubmit} noValidate>
        <FormError message={submitError} />
        <TextField
          label="Stellar public key"
          placeholder="G..."
          value={publicKey}
          onChange={(e) => setPublicKey(e.target.value.trim())}
          error={fieldError}
        />
        <Button type="submit" loading={linkMutation.isPending}>
          {linkMutation.isPending ? 'Linking…' : currentWallet ? 'Update wallet' : 'Link wallet'}
        </Button>
      </form>
    </div>
  );
}
