import { useState } from 'react';
import { Button } from '../../../components/Button';
import { Dialog } from '../../../components/Dialog';
import { Spinner } from '../../../components/Spinner';
import { useT } from '../../../i18n/useT';
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
  const t = useT();

  const unsavedGuard = useUnsavedChangesGuard(locationDirty || priceDirty);

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

      <Dialog
        open={unsavedGuard.pendingHref !== null}
        onClose={unsavedGuard.cancelLeave}
        labelledBy="unsaved-settings-title"
        describedBy="unsaved-settings-description"
        overlayClassName={styles.modalOverlay}
        panelClassName={styles.modalContent}
      >
        <h3 id="unsaved-settings-title">
          {t('facilitySettings.unsaved.title', 'Discard unsaved changes?')}
        </h3>
        <p id="unsaved-settings-description" className={styles.modalDescription}>
          {t(
            'facilitySettings.unsaved.description',
            'You have unsaved facility settings. If you leave this page, those changes will be lost.',
          )}
        </p>
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={unsavedGuard.cancelLeave}>
            {t('facilitySettings.unsaved.cancel', 'Keep editing')}
          </Button>
          <Button variant="danger" onClick={unsavedGuard.confirmLeave}>
            {t('facilitySettings.unsaved.confirm', 'Discard and leave')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
