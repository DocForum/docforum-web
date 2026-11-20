import { Spinner } from '../../../components/Spinner';
import { ApiKeysPanel } from './ApiKeysPanel';
import { WebhooksPanel } from './WebhooksPanel';
import { useFacilityMembers } from '../../facility-team/hooks/useFacilityTeam';
import { useAuthStore } from '../../../store/auth-store';
import styles from './Integrations.module.css';

interface IntegrationsViewProps {
  facilityId?: string;
  isOwnerOverride?: boolean;
}

export function IntegrationsView({
  facilityId = 'fac-main',
  isOwnerOverride,
}: IntegrationsViewProps) {
  const user = useAuthStore((state) => state.user);
  const { data: membersData, isLoading } = useFacilityMembers(facilityId);

  // Owner-only: only trust the membership list. Until it loads we show a
  // spinner rather than guessing, and if it can't be loaded we deny access.
  const isOwner =
    isOwnerOverride !== undefined
      ? isOwnerOverride
      : user?.role === 'facility' &&
        Boolean(
          membersData?.some(
            (m) =>
              (m.email === user.email || m.isCurrentUser) && m.role === 'owner',
          ),
        );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <h1>Integrations</h1>
          <p className={styles.headerSubtitle}>
            Manage API keys and webhooks to connect your lab or pharmacy systems with DocForum.
          </p>
        </div>
        <a
          href="https://github.com/DocForum/docforum-core/blob/main/docs/api/README.md"
          className={styles.docsLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          Integration docs →
        </a>
      </div>

      {isLoading ? (
        <div className={styles.emptyState}>
          <Spinner size={24} />
          <p>Checking access…</p>
        </div>
      ) : !isOwner ? (
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            background: '#fdf3d8',
            border: '1px solid #ebd08c',
            color: '#8c5b00',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)',
          }}
        >
          Integrations are available to facility owners only. Ask a facility owner to
          manage API keys and webhooks.
        </div>
      ) : (
        <>
          <ApiKeysPanel facilityId={facilityId} />
          <WebhooksPanel facilityId={facilityId} />
        </>
      )}
    </div>
  );
}
