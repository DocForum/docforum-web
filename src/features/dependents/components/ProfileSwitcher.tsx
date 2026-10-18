import { useProfileStore } from '../../../store/profile-store';
import styles from './ProfileSwitcher.module.css';

export function ProfileSwitcher() {
  const profiles = useProfileStore((s) => s.profiles);
  const selectedId = useProfileStore((s) => s.selectedProfileId);
  const select = useProfileStore((s) => s.selectProfile);

  if (profiles.length <= 1) return null;

  return (
    <div className={styles.switcher}>
      <label htmlFor="profile-switcher" className={styles.label}>
        Acting for
      </label>
      <select
        id="profile-switcher"
        className={styles.select}
        value={selectedId ?? ''}
        onChange={(e) => select(e.target.value)}
      >
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.fullName}{p.isSelf ? ' (you)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
