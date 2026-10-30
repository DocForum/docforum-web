import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../../components/Button';
import { TextField } from '../../../components/TextField';
import { useUpdateFacilitySettings } from '../hooks/useFacilitySettings';
import type { FacilitySettings, FacilityOpeningHours, Weekday } from '../../../types/models';
import {
  WEEKDAYS,
  WEEKDAY_LABELS,
  draftToSettingsInput,
  hasFacilitySettingsErrors,
  settingsToDraft,
  validateFacilitySettings,
  type FacilitySettingsDraft,
  type FacilitySettingsErrors,
} from '../validation';
import { LocationMapPicker } from './LocationMapPicker';
import styles from './FacilitySettings.module.css';

interface LocationContactEditorProps {
  facilityId: string;
  settings: FacilitySettings;
  onDirtyChange: (dirty: boolean) => void;
}

const EMPTY_ERRORS: FacilitySettingsErrors = { openingHours: {} };

export function LocationContactEditor({
  facilityId,
  settings,
  onDirtyChange,
}: LocationContactEditorProps) {
  const [draft, setDraft] = useState<FacilitySettingsDraft>(() => settingsToDraft(settings));
  const [baseline, setBaseline] = useState(() => JSON.stringify(settingsToDraft(settings)));
  const [errors, setErrors] = useState<FacilitySettingsErrors>(EMPTY_ERRORS);
  const [showValidation, setShowValidation] = useState(false);
  const [saved, setSaved] = useState(false);
  const updateMutation = useUpdateFacilitySettings(facilityId);
  const isDirty = JSON.stringify(draft) !== baseline;

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    const next = settingsToDraft(settings);
    setDraft(next);
    setBaseline(JSON.stringify(next));
    setErrors(EMPTY_ERRORS);
    setShowValidation(false);
  }, [settings]);

  useEffect(() => {
    if (showValidation) setErrors(validateFacilitySettings(draft));
  }, [draft, showValidation]);

  const updateField = <K extends keyof FacilitySettingsDraft>(
    key: K,
    value: FacilitySettingsDraft[K],
  ) => {
    setSaved(false);
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const updateHours = (day: Weekday, patch: Partial<FacilityOpeningHours>) => {
    setSaved(false);
    setDraft((current) => ({
      ...current,
      openingHours: current.openingHours.map((entry) =>
        entry.day === day ? { ...entry, ...patch } : entry,
      ),
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaved(false);
    setShowValidation(true);
    const nextErrors = validateFacilitySettings(draft);
    setErrors(nextErrors);
    if (hasFacilitySettingsErrors(nextErrors)) return;

    try {
      const updated = await updateMutation.mutateAsync(draftToSettingsInput(draft));
      const next = settingsToDraft(updated);
      setDraft(next);
      setBaseline(JSON.stringify(next));
      setErrors(EMPTY_ERRORS);
      setShowValidation(false);
      setSaved(true);
      onDirtyChange(false);
    } catch {
      // The mutation error is rendered below.
    }
  };

  const resetDraft = () => {
    const next = settingsToDraft(settings);
    setDraft(next);
    setErrors(EMPTY_ERRORS);
    setShowValidation(false);
    setSaved(false);
    onDirtyChange(JSON.stringify(next) !== baseline);
  };

  return (
    <section className={styles.card} aria-labelledby="facility-location-heading">
      <div className={styles.cardHeader}>
        <div>
          <h2 id="facility-location-heading">Location &amp; contact</h2>
          <p className={styles.cardSubtitle}>
            Keep the address and map pin current so patients see accurate distances, and update the
            phone and email patients use to reach you.
          </p>
        </div>
        {isDirty && <span className={styles.unsavedBadge}>Unsaved changes</span>}
      </div>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <TextField
          label="Street address"
          value={draft.address}
          onChange={(event) => updateField('address', event.target.value)}
          error={errors.address}
          autoComplete="street-address"
          required
        />
        <div className={styles.twoColumn}>
          <TextField
            label="City"
            value={draft.city}
            onChange={(event) => updateField('city', event.target.value)}
            error={errors.city}
            autoComplete="address-level2"
            required
          />
          <TextField
            label="Contact phone"
            type="tel"
            value={draft.phone}
            onChange={(event) => updateField('phone', event.target.value)}
            error={errors.phone}
            autoComplete="tel"
            required
          />
        </div>
        <TextField
          label="Contact email (optional)"
          type="email"
          value={draft.email}
          onChange={(event) => updateField('email', event.target.value)}
          error={errors.email}
          autoComplete="email"
        />

        <div className={styles.sectionDivider}>
          <h3>Map pin</h3>
          <p className={styles.helperText}>
            Coordinates drive distance-sorted results. Click the map or type exact coordinates.
          </p>
        </div>

        <LocationMapPicker
          latitude={draft.latitude}
          longitude={draft.longitude}
          onCoordinateChange={(latitude, longitude) => {
            setSaved(false);
            setDraft((current) => ({ ...current, latitude, longitude }));
          }}
        />

        <div className={styles.twoColumn}>
          <TextField
            label="Latitude"
            type="number"
            inputMode="decimal"
            step="any"
            value={draft.latitude}
            onChange={(event) => updateField('latitude', event.target.value)}
            error={errors.latitude}
            required
          />
          <TextField
            label="Longitude"
            type="number"
            inputMode="decimal"
            step="any"
            value={draft.longitude}
            onChange={(event) => updateField('longitude', event.target.value)}
            error={errors.longitude}
            required
          />
        </div>

        <fieldset className={styles.hoursFieldset}>
          <legend>Opening hours</legend>
          <p className={styles.helperText}>
            Set each day the facility accepts orders. Times use the facility&apos;s local time.
          </p>
          <div className={styles.hoursTable}>
            {WEEKDAYS.map((day) => {
              const entry = draft.openingHours.find((hours) => hours.day === day) ?? {
                day,
                closed: true,
                opensAt: null,
                closesAt: null,
              };
              const dayErrors = errors.openingHours[day] ?? {};
              return (
                <div className={styles.hoursRow} key={day}>
                  <label className={styles.dayLabel}>
                    <input
                      type="checkbox"
                      checked={!entry.closed}
                      onChange={(event) =>
                        updateHours(day, {
                          closed: !event.target.checked,
                          opensAt: event.target.checked ? entry.opensAt ?? '09:00' : null,
                          closesAt: event.target.checked ? entry.closesAt ?? '17:00' : null,
                        })
                      }
                    />
                    {WEEKDAY_LABELS[day]}
                  </label>
                  <div className={styles.timeField}>
                    <label htmlFor={`${day}-opens`}>Opens</label>
                    <input
                      id={`${day}-opens`}
                      type="time"
                      value={entry.opensAt ?? ''}
                      disabled={entry.closed}
                      aria-invalid={Boolean(dayErrors.opensAt)}
                      aria-describedby={dayErrors.opensAt ? `${day}-opens-error` : undefined}
                      onChange={(event) => updateHours(day, { opensAt: event.target.value })}
                    />
                    {dayErrors.opensAt && (
                      <span id={`${day}-opens-error`} className={styles.timeError} role="alert">
                        {dayErrors.opensAt}
                      </span>
                    )}
                  </div>
                  <div className={styles.timeField}>
                    <label htmlFor={`${day}-closes`}>Closes</label>
                    <input
                      id={`${day}-closes`}
                      type="time"
                      value={entry.closesAt ?? ''}
                      disabled={entry.closed}
                      aria-invalid={Boolean(dayErrors.closesAt)}
                      aria-describedby={dayErrors.closesAt ? `${day}-closes-error` : undefined}
                      onChange={(event) => updateHours(day, { closesAt: event.target.value })}
                    />
                    {dayErrors.closesAt && (
                      <span id={`${day}-closes-error`} className={styles.timeError} role="alert">
                        {dayErrors.closesAt}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </fieldset>

        {updateMutation.error && (
          <div className={styles.errorBox} role="alert">
            Could not save facility settings: {updateMutation.error.message}
          </div>
        )}
        {saved && (
          <div className={styles.successBox} role="status">
            Location and contact details saved.
          </div>
        )}

        <div className={styles.actions}>
          <Button type="submit" loading={updateMutation.isPending}>
            Save location &amp; contact
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={resetDraft}
            disabled={updateMutation.isPending || !isDirty}
          >
            Discard changes
          </Button>
        </div>
      </form>
    </section>
  );
}
