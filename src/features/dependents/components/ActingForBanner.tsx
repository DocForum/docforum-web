import { useProfileStore } from '../../../store/profile-store';
import styles from './ActingForBanner.module.css';

export function ActingForBanner() {
  const profile = useProfileStore((s) => s.selectedProfile());

  if (!profile || profile.isSelf) return null;

  return (
    <div className={styles.banner} role="status">
      Acting for: <strong>{profile.fullName}</strong>
    </div>
  );
}
