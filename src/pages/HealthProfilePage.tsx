import { useState } from 'react';
import { HealthSection } from '../features/health-profile/components/HealthSection';
import { ActingForBanner } from '../features/dependents/components/ActingForBanner';
import type { HealthSectionKey } from '../types/models';
import { useT } from '../i18n/useT';

const SECTIONS: HealthSectionKey[] = ['allergies', 'conditions', 'medications'];

export function HealthProfilePage() {
  const [dirty, setDirty] = useState(false);
  const t = useT();

  // Unsaved-changes warning on navigation
  if (typeof window !== 'undefined') {
    window.onbeforeunload = dirty ? () => '' : null;
  }

  return (
    <div className="container" onInput={() => setDirty(true)}>
      <ActingForBanner />
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 600, margin: 0 }}>
          {t('health.title', 'Health profile')}
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: 0 }}>
          {t(
            'health.subtitle',
            'Keep your allergies, conditions and medications up to date. This information is shared with your care team during intake.',
          )}
        </p>
        {SECTIONS.map((s) => (
          <HealthSection key={s} section={s} />
        ))}
      </div>
    </div>
  );
}
