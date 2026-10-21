import { useRef } from 'react';
import { DataExportSection } from '../features/account/components/DataExportSection';
import { DeleteAccountSection } from '../features/account/components/DeleteAccountSection';
import { ActingForBanner } from '../features/dependents/components/ActingForBanner';

export function AccountSettingsPage() {
  const exportSectionRef = useRef<HTMLDivElement>(null);

  const handleScrollToExport = () => {
    exportSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <ActingForBanner />
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', margin: '0 0 var(--space-2)' }}>
          Account settings & privacy
        </h1>
        <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: 'var(--text-base)' }}>
          Manage your personal health data rights, privacy controls, and account lifecycle.
        </p>
      </div>

      <div ref={exportSectionRef}>
        <DataExportSection />
      </div>

      <div>
        <DeleteAccountSection onRequestExportClick={handleScrollToExport} />
      </div>
    </div>
  );
}
