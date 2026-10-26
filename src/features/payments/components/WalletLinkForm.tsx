import { useState } from 'react';
import { FormProvider } from 'react-hook-form';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { FormField } from '../../../components/form/FormField';
import { useZodForm } from '../../../hooks/useZodForm';
import { mapServerErrors } from '../../../utils/form';
import { useErrorMessage } from '../../../hooks/useErrorText';
import { useLinkWallet, useOwnWalletLink } from '../hooks/useWalletLink';
import { z } from 'zod';
import { ApiError } from '../../../services/api-client';

const STELLAR_PUBLIC_KEY_PATTERN = /^G[A-Z2-7]{55}$/;

const walletSchema = z.object({
  publicKey: z
    .string()
    .trim()
    .regex(STELLAR_PUBLIC_KEY_PATTERN, 'Enter a valid Stellar public key (starts with G, 56 characters).'),
});

type WalletFormData = z.infer<typeof walletSchema>;

/**
 * Lets a signed-in facility user link the Stellar address docforum-core
 * pays out to on release — see docforum-core's docs/adr/0004. This repo
 * never talks to Stellar directly (hard rule 1); it only ever POSTs a
 * public key string to docforum-core's own API.
 */
export function WalletLinkForm() {
  const form = useZodForm(walletSchema, { publicKey: '' });
  const walletQuery = useOwnWalletLink();
  const linkMutation = useLinkWallet();
  const errorMessage = useErrorMessage();
  const [serverError, setServerError] = useState<string | null>(null);

  async function onSubmit(data: WalletFormData) {
    setServerError(null);
    try {
      await linkMutation.mutateAsync(data.publicKey);
    } catch (error) {
      if (error instanceof ApiError) {
        const fieldErrors = mapServerErrors(error.body);
        if (Object.keys(fieldErrors).length > 0) {
          Object.entries(fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof WalletFormData, { message });
          });
          return;
        }
      }
      setServerError(errorMessage(error));
    }
  }

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

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FormError message={serverError} />
          <FormField name="publicKey" label="Stellar public key" placeholder="G..." />
          <Button type="submit" loading={linkMutation.isPending}>
            {linkMutation.isPending ? 'Linking…' : currentWallet ? 'Update wallet' : 'Link wallet'}
          </Button>
        </form>
      </FormProvider>
    </div>
  );
}
