import { type FormEvent, useState } from 'react';
import { Button } from '../../../components/Button';
import { TextField } from '../../../components/TextField';
import { FormError } from '../../../components/FormError';
import { useSendHandoverInvite, useResendHandoverInvite } from '../hooks/useDependents';
import { ApiError } from '../../../services/api-client';
import type { Dependent } from '../../../types/models';
import styles from './HandoverNotice.module.css';

interface Props {
  dependent: Dependent;
}

export function HandoverNotice({ dependent }: Props) {
  const sendInvite = useSendHandoverInvite();
  const resendInvite = useResendHandoverInvite();
  const [email, setEmail] = useState('');

  if (dependent.handoverStatus === 'not_eligible' || dependent.handoverStatus === 'claimed') {
    return null;
  }

  function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    sendInvite.mutate({ dependentId: dependent.id, email: email.trim() });
  }

  function handleResend() {
    resendInvite.mutate(dependent.id);
  }

  const isExpired = dependent.claimInviteExpiresAt && new Date(dependent.claimInviteExpiresAt) < new Date();

  return (
    <div className={styles.notice}>
      <h4 className={styles.title}>Account handover</h4>

      {dependent.handoverStatus === 'eligible' && (
        <>
          <p className={styles.explanation}>
            {dependent.fullName} is approaching the age where they can manage their own health record.
            Send them an invite so they can set up their own account. You will retain read access to
            past records but will no longer be able to book or edit on their behalf.
          </p>
          <form onSubmit={handleSend} className={styles.form}>
            <TextField
              label="Their email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <FormError
              message={sendInvite.error instanceof ApiError ? sendInvite.error.message : sendInvite.error ? 'Failed to send invite.' : null}
            />
            <Button type="submit" loading={sendInvite.isPending}>
              Send handover invite
            </Button>
          </form>
        </>
      )}

      {dependent.handoverStatus === 'invited' && (
        <>
          <p className={styles.explanation}>
            An invite was sent to <strong>{dependent.claimEmail}</strong>.
            {isExpired
              ? ' The invite has expired — resend it below.'
              : ' Once they claim it, you will retain read access to past records but will no longer be able to book or edit on their behalf.'}
          </p>
          <div className={styles.accessSummary}>
            <p className={styles.accessTitle}>After handover, you will:</p>
            <ul className={styles.accessList}>
              <li>Keep read-only access to past appointments and health records</li>
              <li>Lose the ability to book appointments on their behalf</li>
              <li>Lose the ability to edit their health profile</li>
            </ul>
          </div>
          {isExpired && (
            <>
              <FormError
                message={resendInvite.error instanceof ApiError ? resendInvite.error.message : resendInvite.error ? 'Failed to resend.' : null}
              />
              <Button onClick={handleResend} loading={resendInvite.isPending}>
                Resend invite
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}
