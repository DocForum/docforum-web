import { FacilityFinder } from '../features/orders/components/FacilityFinder';
import { ActingForBanner } from '../features/dependents/components/ActingForBanner';
import { useT } from '../i18n/useT';

export function FacilityFinderPage() {
  const t = useT();

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <ActingForBanner />
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', margin: '0 0 var(--space-2)' }}>
          {t('facilityFinder.title', 'Find pharmacies & diagnostic labs')}
        </h1>
        <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: 'var(--text-base)' }}>
          {t(
            'facilityFinder.subtitle',
            'Browse participating facilities, compare real distances, and pick where to fulfill your prescriptions or diagnostic laboratory orders.',
          )}
        </p>
      </div>

      <FacilityFinder />
    </div>
  );
}
