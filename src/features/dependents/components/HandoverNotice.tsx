import { type FormEvent, useState } from 'react';
import { Button } from '../../../components/Button';
import { TextField } from '../../../components/TextField';
import { FormError } from '../../../components/FormError';
import { useSendHandoverInvite, useResendHandoverInvite } from '../hooks/useDependents';
import { useT } from '../../../i18n/useT';
import { useErrorMessage } from '../../../hooks/useErrorText';
import type { Dependent } from '../../../types/models';
import styles from './HandoverNotice.module.css';

interface Props {
  dependent: Dependent;
}

export function HandoverNotice({ dependent }: Props) {
  const sendInvite = useSendHandoverInvite();
  const resendInvite = useResendHandoverInvite();
  const [email, setEmail] = useState('');
  const t = useT();
  const errorMessage = useErrorMessage();

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
      <h2 className={styles.title}>{t('dependents.handover.title', 'Account handover')}</h2>

      {dependent.handoverStatus === 'eligible' && (
        <>
          <p className={styles.explanation}>
            {t('dependents.handover.eligibleBody', '{name} is approaching the age where they can manage their own health record. Send them an invite so they can set up their own account. You will retain read access to past records but will no longer be able to book or edit on their behalf.', { name: dependent.fullName })}
          </p>
          <form onSubmit={handleSend} className={styles.form}>
            <TextField
              label={t('dependents.handover.email', 'Their email address')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <FormError message={errorMessage(sendInvite.error)} />
            <Button type="submit" loading={sendInvite.isPending}>
              {t('dependents.handover.send', 'Send handover invite')}
            </Button>
          </form>
        </>
      )}

      {dependent.handoverStatus === 'invited' && (
        <>
          <p className={styles.explanation}>
            {t('dependents.handover.invitedBody', 'An invite was sent to {email}.', { email: dependent.claimEmail })}
            {isExpired
              ? t('dependents.handover.expired', ' The invite has expired — resend it below.')
              : t('dependents.handover.claimNotice', ' Once they claim it, you will retain read access to past records but will no longer be able to book or edit on their behalf.')}
          </p>
          <div className={styles.accessSummary}>
            <p className={styles.accessTitle}>{t('dependents.handover.afterTitle', 'After handover, you will:')}</p>
            <ul className={styles.accessList}>
              <li>{t('dependents.handover.after1', 'Keep read-only access to past appointments and health records')}</li>
              <li>{t('dependents.handover.after2', 'Lose the ability to book appointments on their behalf')}</li>
              <li>{t('dependents.handover.after3', 'Lose the ability to edit their health profile')}</li>
            </ul>
          </div>
          {isExpired && (
            <>
              <FormError message={errorMessage(resendInvite.error)} />
              <Button onClick={handleResend} loading={resendInvite.isPending}>
                {t('dependents.handover.resend', 'Resend invite')}
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}
