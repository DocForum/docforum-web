import { TwoFactorSection } from '../features/account/components/TwoFactorSection';
import { useT } from '../i18n/useT';

export function AccountSecurityPage() {
  const t = useT();
  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1>{t('accountSecurity.title', 'Account security')}</h1>
        <p>{t('accountSecurity.description', 'Manage sign-in protection for your DocForum account.')}</p>
      </div>
      <TwoFactorSection />
    </div>
  );
}
