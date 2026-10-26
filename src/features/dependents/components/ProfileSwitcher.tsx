import { useProfileStore } from '../../../store/profile-store';
import { useT } from '../../../i18n/useT';
import styles from './ProfileSwitcher.module.css';

export function ProfileSwitcher() {
  const profiles = useProfileStore((s) => s.profiles);
  const selectedId = useProfileStore((s) => s.selectedProfileId);
  const select = useProfileStore((s) => s.selectProfile);
  const t = useT();

  if (profiles.length <= 1) return null;

  return (
    <div className={styles.switcher}>
      <label htmlFor="profile-switcher" className={styles.label}>
        {t('dependents.actingForLabel', 'Acting for')}
      </label>
      <select
        id="profile-switcher"
        className={styles.select}
        value={selectedId ?? ''}
        onChange={(e) => select(e.target.value)}
      >
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.isSelf ? t('dependents.profileOptionSelf', '{name} (you)', { name: p.fullName }) : p.fullName}
          </option>
        ))}
      </select>
    </div>
  );
}
