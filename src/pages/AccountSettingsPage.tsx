import { useRef } from 'react';
import { DataExportSection } from '../features/account/components/DataExportSection';
import { DeleteAccountSection } from '../features/account/components/DeleteAccountSection';
import { ActingForBanner } from '../features/dependents/components/ActingForBanner';
import { CalendarSubscriptionSection } from '../features/settings/components/CalendarSubscriptionSection';
import { TimeZonePreference } from '../i18n/components/TimeZonePreference';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useT } from '../i18n/useT';

export function AccountSettingsPage() {
  const exportSectionRef = useRef<HTMLDivElement>(null);
  const t = useT();

  const handleScrollToExport = () => {
    exportSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <ActingForBanner />
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', margin: '0 0 var(--space-2)' }}>
          {t('accountSettings.title', 'Account settings & privacy')}
        </h1>
        <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: 'var(--text-base)' }}>
          {t(
            'accountSettings.subtitle',
            'Manage your personal health data rights, privacy controls, and account lifecycle.',
          )}
        </p>
      </div>

      <TimeZonePreference />

      <ErrorBoundary level="section">
        <div ref={exportSectionRef}>
          <DataExportSection />
        </div>
      </ErrorBoundary>

      <ErrorBoundary level="section">
        <CalendarSubscriptionSection />
      </ErrorBoundary>

      <ErrorBoundary level="section">
        <div>
          <DeleteAccountSection onRequestExportClick={handleScrollToExport} />
        </div>
      </ErrorBoundary>
    </div>
  );
}
