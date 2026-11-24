import { useProfileStore } from '../../../store/profile-store';
import { useT } from '../../../i18n/useT';
import styles from './ActingForBanner.module.css';

export function ActingForBanner() {
  const profile = useProfileStore((s) => s.selectedProfile());
  const t = useT();

  if (!profile || profile.isSelf) return null;

  return (
    <div className={styles.banner} role="status">
      {t('dependents.actingForLabel', 'Acting for')}: <strong>{profile.fullName}</strong>
    </div>
  );
}
