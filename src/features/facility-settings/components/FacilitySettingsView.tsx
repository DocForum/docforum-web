import { useState } from 'react';
import { Spinner } from '../../../components/Spinner';
import { useFacilitySettings } from '../hooks/useFacilitySettings';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
import { LocationContactEditor } from './LocationContactEditor';
import { PriceListEditor } from './PriceListEditor';
import styles from './FacilitySettings.module.css';

interface FacilitySettingsViewProps {
  facilityId?: string;
}

export function FacilitySettingsView({ facilityId = 'fac-main' }: FacilitySettingsViewProps) {
  const [locationDirty, setLocationDirty] = useState(false);
  const [priceDirty, setPriceDirty] = useState(false);
  const { data: settings, isLoading, error } = useFacilitySettings(facilityId);

  useUnsavedChangesGuard(locationDirty || priceDirty);

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <div>
          <h1>Facility settings</h1>
          <p className={styles.pageSubtitle}>
            Keep the location patients search by, the opening hours and contact details they rely
            on, and the prices used to create future payments up to date.
          </p>
        </div>
      </header>

      {isLoading && (
        <div className={styles.loadingRow} role="status">
          <Spinner size={20} /> Loading facility settings…
        </div>
      )}

      {error && (
        <div className={styles.errorBox} role="alert">
          Could not load facility settings: {error.message}
        </div>
      )}

      {settings && (
        <>
          <LocationContactEditor
            facilityId={facilityId}
            settings={settings}
            onDirtyChange={setLocationDirty}
          />
          <PriceListEditor facilityId={facilityId} onDirtyChange={setPriceDirty} />
        </>
      )}
    </div>
  );
}
