import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePendingReferrals, useAcceptReferral, useDeclineReferral } from '../hooks/useReferrals';
import type { PatientAppointment } from '../../../types/models';
import styles from './ReferralList.module.css';

export function ReferralList() {
  const { data: referrals = [], isLoading, isError } = usePendingReferrals();
  const acceptMutation = useAcceptReferral();
  const declineMutation = useDeclineReferral();

  const [acceptedAppointment, setAcceptedAppointment] = useState<{
    referralId: string;
    appointment: PatientAppointment;
  } | null>(null);

  const handleAccept = async (referralId: string) => {
    try {
      const response = await acceptMutation.mutateAsync(referralId);
      setAcceptedAppointment({
        referralId,
        appointment: response.createdAppointment,
      });
    } catch {
      // Error is handled by mutation state / banner
    }
  };

  const handleDecline = async (referralId: string) => {
    try {
      await declineMutation.mutateAsync(referralId);
    } catch {
      // Error handled
    }
  };

  if (isLoading) {
    return <p>Loading pending referrals…</p>;
  }

  if (isError) {
    return <p className={styles.empty}>Could not load pending referrals.</p>;
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Pending Specialist Referrals</h2>
      <p className={styles.subtitle}>
        Your doctor referred you for specialist care. Review and confirm below to automatically schedule your appointment.
      </p>

      {acceptedAppointment && (
        <div className={styles.acceptedNotice} role="alert">
          <div className={styles.acceptedHeader}>Referral Accepted & Appointment Created!</div>
          <div>
            An appointment with specialist in <strong>{acceptedAppointment.appointment.doctorSpecialty}</strong> has been created.
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>
            <em>No need to re-enter intake information — your clinical record and referral notes have been automatically attached.</em>
          </p>
          <div style={{ marginTop: '0.5rem' }}>
            <Link to={`/patient/appointments/${acceptedAppointment.appointment.id}`} className="button primary">
              View Scheduled Appointment
            </Link>
          </div>
        </div>
      )}

      {referrals.length === 0 ? (
        <p className={styles.empty}>You have no pending specialist referrals at this time.</p>
      ) : (
        <div className={styles.list}>
          {referrals.map((referral) => (
            <div key={referral.id} className={styles.card}>
              <div className={styles.doctorInfo}>
                <div>
                  <div className={styles.doctorName}>Referred by {referral.referringDoctorName}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    {new Date(referral.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <span className={styles.specialtyBadge}>{referral.targetSpecialty}</span>
              </div>

              <div className={styles.reasonBox}>
                <strong>Reason for referral:</strong> {referral.reason}
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  className="button primary"
                  disabled={acceptMutation.isPending || declineMutation.isPending}
                  onClick={() => handleAccept(referral.id)}
                >
                  {acceptMutation.isPending ? 'Accepting…' : 'Accept Referral & Book'}
                </button>
                <button
                  type="button"
                  className="button secondary"
                  disabled={acceptMutation.isPending || declineMutation.isPending}
                  onClick={() => handleDecline(referral.id)}
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
