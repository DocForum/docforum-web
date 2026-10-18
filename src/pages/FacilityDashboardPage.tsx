import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { WalletLinkForm } from '../features/payments/components/WalletLinkForm';
import { FulfillmentQueueWithAttribution } from '../features/facility-team/components/FulfillmentQueueWithAttribution';
import { useFulfillmentQueue, useUpdateFulfillmentItem } from '../features/facility-team/hooks/useFacilityTeam';
import type { FulfillmentQueueItem } from '../types/models';
import styles from '../features/facility-team/components/FacilityTeam.module.css';

export const DEFAULT_MOCK_QUEUE: FulfillmentQueueItem[] = [
  {
    id: 'queue-1',
    facilityId: 'fac-main',
    orderId: 'ord-rx-101',
    orderType: 'prescription',
    patientName: 'John Doe',
    patientProfileId: 'pat-1',
    itemName: 'Amoxicillin 500mg (30 capsules)',
    instructions: 'Take 1 capsule three times daily with meals for 10 days.',
    status: 'fulfilled',
    receivedAt: '2026-10-18T08:30:00Z',
    attribution: {
      action: 'dispensed',
      performedByUserId: 'user-owner-1',
      performedByName: 'Dr. Evelyn Reed',
      performedByEmail: 'evelyn.reed@centralpharmacy.org',
      performedByRole: 'owner',
      timestamp: '2026-10-18T09:15:00Z',
      notes: 'Batch #B-9912 verified and dispensed with patient leaflet',
    },
  },
  {
    id: 'queue-2',
    facilityId: 'fac-main',
    orderId: 'ord-lab-204',
    orderType: 'lab',
    patientName: 'Alice Smith',
    patientProfileId: 'pat-2',
    itemName: 'Fasting Lipid Panel & HbA1c',
    instructions: '12-hour fasting venous blood sample required.',
    status: 'fulfilled',
    receivedAt: '2026-10-18T09:00:00Z',
    attribution: {
      action: 'sample_collected',
      performedByUserId: 'user-staff-1',
      performedByName: 'Marcus Vance, PharmD',
      performedByEmail: 'marcus.vance@centralpharmacy.org',
      performedByRole: 'staff',
      timestamp: '2026-10-18T10:05:00Z',
      notes: 'Phlebotomy completed without complications',
    },
  },
  {
    id: 'queue-3',
    facilityId: 'fac-main',
    orderId: 'ord-rx-309',
    orderType: 'prescription',
    patientName: 'Robert Garcia',
    patientProfileId: 'pat-3',
    itemName: 'Metformin 850mg (60 tablets)',
    instructions: 'Take 1 tablet twice daily with food.',
    status: 'pending',
    receivedAt: '2026-10-18T10:30:00Z',
    attribution: null,
  },
];

export function FacilityDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const facilityId = 'fac-main';

  const { data: queueData } = useFulfillmentQueue(facilityId);
  const updateMutation = useUpdateFulfillmentItem(facilityId);

  // Use local state if user performs actions in-session
  const [localQueue, setLocalQueue] = useState<FulfillmentQueueItem[] | null>(null);

  const displayQueue: FulfillmentQueueItem[] = localQueue ?? queueData ?? DEFAULT_MOCK_QUEUE;

  const handleQueueAction = async (itemId: string, action: 'fulfilled' | 'rejected') => {
    try {
      await updateMutation.mutateAsync({ itemId, action });
    } catch {
      // Local fallback state update for demonstration when backend endpoint is not yet connected
      setLocalQueue((prev) => {
        const current = prev ?? DEFAULT_MOCK_QUEUE;
        return current.map((item) => {
          if (item.id === itemId) {
            return {
              ...item,
              status: action,
              attribution: {
                action: item.orderType === 'prescription' ? 'dispensed' : 'sample_collected',
                performedByUserId: user?.id ?? 'usr-current',
                performedByName: user?.email.split('@')[0] ?? 'Staff User',
                performedByEmail: user?.email ?? 'staff@facility.org',
                performedByRole: 'staff',
                timestamp: new Date().toISOString(),
              },
            };
          }
          return item;
        });
      });
    }
  };

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}>
      <nav className={styles.tabsNav} aria-label="Facility navigation">
        <Link to="/facility" className={`${styles.tabLink} ${styles.tabLinkActive}`}>
          Fulfillment Queue
        </Link>
        <Link to="/facility/team" className={styles.tabLink}>
          Team &amp; Staff Accounts
        </Link>
      </nav>

      <div className={styles.header}>
        <div>
          <h1>Facility dashboard</h1>
          <p className={styles.headerSubtitle}>
            Welcome{user ? `, ${user.email}` : ''} • Central Pharmacy &amp; Diagnostic Center
          </p>
        </div>
      </div>

      <FulfillmentQueueWithAttribution
        items={displayQueue}
        onAction={handleQueueAction}
        isUpdating={updateMutation.isPending}
      />

      <WalletLinkForm />
    </div>
  );
}
