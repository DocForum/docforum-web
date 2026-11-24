import { TwoFactorSection } from '../features/account/components/TwoFactorSection';

export function AccountSecurityPage() {
  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1>Account security</h1>
        <p>Manage sign-in protection for your DocForum account.</p>
      </div>
      <TwoFactorSection />
    </div>
  );
}
