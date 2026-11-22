import { useId, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { TextField } from '../../../components/TextField';
import { ApiError } from '../../../services/api-client';
import type {
  IssuedLabOrder,
  IssuedPrescription,
  LabOrderUrgency,
  PrescriptionItemInput,
} from '../../../types/models';
import { useEligibleFacilities, useIssueLabOrder, useIssuePrescription } from '../hooks/useConsultationOrders';
import { resolvePricing, type PriceMode } from '../pricing';
import styles from './ConsultationOutcomePanel.module.css';

export interface OrderFormProps {
  consultationId: string;
  onIssued: (order: IssuedPrescription | IssuedLabOrder) => void;
}

/** A 403 here is docforum-core's verified-doctor gate, not a permission bug. */
export function OrderErrorAlert({ error }: { error: unknown }) {
  if (!error) return null;
  const isForbidden = error instanceof ApiError && error.status === 403;
  const message = error instanceof Error ? error.message : 'The order could not be issued.';

  if (isForbidden) {
    return (
      <div className={styles.alert} role="alert">
        <p className={styles.alertTitle}>Orders need a verified doctor profile</p>
        <p>
          docforum-core rejected this order because this account isn’t verified to
          prescribe yet. Check your verification status before trying again.
        </p>
        <Link className={styles.alertLink} to="/doctor/verification">
          Check verification status
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.alert} role="alert">
      {message}
    </div>
  );
}

function useFacilityOptions(type: 'lab' | 'pharmacy') {
  const query = useEligibleFacilities(type);
  const facilities = query.data ?? [];
  return {
    facilities,
    isLoading: query.isLoading,
    failed: query.isError,
  };
}

function FacilityField({
  type,
  value,
  onChange,
  onBlur,
}: {
  type: 'lab' | 'pharmacy';
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}) {
  const id = useId();
  const { facilities, isLoading, failed } = useFacilityOptions(type);
  const noun = type === 'pharmacy' ? 'pharmacy' : 'lab';

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {type === 'pharmacy' ? 'Dispensing pharmacy' : 'Fulfilling lab'}
      </label>
      <select
        id={id}
        className={styles.select}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        required
        disabled={isLoading}
      >
        <option value="">
          {isLoading ? `Loading ${noun} options…` : `Choose a ${noun}`}
        </option>
        {facilities.map((facility) => (
          <option key={facility.id} value={facility.id}>
            {facility.name}
            {facility.priceOnRequest ? ' — price on request' : ''}
          </option>
        ))}
      </select>
      {failed && (
        <p className={styles.hint} role="status">
          Couldn’t load qualified {noun} facilities. Pick one from the list once
          the connection recovers.
        </p>
      )}
      {!isLoading && !failed && facilities.length === 0 && (
        <p className={styles.hint}>
          No {noun} facility is qualified for this order kind yet.
        </p>
      )}
    </div>
  );
}

interface PriceState {
  mode: PriceMode;
  catalogItemCode: string;
  amountXlm: string;
  setMode: (mode: PriceMode) => void;
  setCatalogItemCode: (value: string) => void;
  setAmountXlm: (value: string) => void;
}

/**
 * docforum-core takes exactly ONE of `catalogItemCode` (the facility's
 * published price) or `amountStroops` (a manual price), never both.
 */
function PriceFields({ price }: { price: PriceState }) {
  const groupName = useId();
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>Price</legend>
      <div className={styles.radioRow}>
        <label className={styles.radio}>
          <input
            type="radio"
            name={groupName}
            checked={price.mode === 'catalog'}
            onChange={() => price.setMode('catalog')}
          />
          Facility price list
        </label>
        <label className={styles.radio}>
          <input
            type="radio"
            name={groupName}
            checked={price.mode === 'manual'}
            onChange={() => price.setMode('manual')}
          />
          Manual price
        </label>
      </div>

      {price.mode === 'catalog' ? (
        <TextField
          label="Catalog item code"
          value={price.catalogItemCode}
          onChange={(event) => price.setCatalogItemCode(event.target.value)}
          placeholder="e.g. amox-500-cap"
          maxLength={100}
          autoComplete="off"
        />
      ) : (
        <TextField
          label="Price (XLM)"
          value={price.amountXlm}
          onChange={(event) => price.setAmountXlm(event.target.value)}
          placeholder="e.g. 2.5"
          inputMode="decimal"
          autoComplete="off"
        />
      )}
      <p className={styles.hint}>
        {price.mode === 'catalog'
          ? 'The facility’s published price is looked up and snapshotted on the payment intent.'
          : '1 XLM = 10,000,000 stroops. The amount is sent as integer stroops.'}
      </p>
    </fieldset>
  );
}

interface ItemRow extends PrescriptionItemInput {
  key: number;
}

let nextKey = 1;
function newMedicationRow(): ItemRow {
  return { key: nextKey++, drugName: '', dosage: '', frequency: '', duration: '' };
}

export function PrescriptionForm({ consultationId, onIssued }: OrderFormProps) {
  const issuePrescription = useIssuePrescription();
  const [facilityProfileId, setFacilityProfileId] = useState('');
  const [items, setItems] = useState<ItemRow[]>([newMedicationRow()]);
  const [mode, setMode] = useState<PriceMode>('manual');
  const [catalogItemCode, setCatalogItemCode] = useState('');
  const [amountXlm, setAmountXlm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const updateItem = (key: number, patch: Partial<PrescriptionItemInput>) => {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  };

  const removeItem = (key: number) => {
    setItems((current) =>
      current.length === 1 ? current : current.filter((item) => item.key !== key),
    );
  };

  const addItem = () => {
    setItems((current) => (current.length >= 100 ? current : [...current, newMedicationRow()]));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!facilityProfileId) {
      setError('Choose the pharmacy that should dispense this prescription.');
      return;
    }

    const blankItem = items.some(
      (item) => !item.drugName.trim() || !item.dosage.trim() || !item.frequency.trim() || !item.duration.trim(),
    );
    if (blankItem) {
      setError('Every medication needs a name, dose, frequency and duration.');
      return;
    }

    const tooLong = items.some((item) =>
      [item.drugName, item.dosage, item.frequency, item.duration].some((value) => value.trim().length > 200),
    );
    if (tooLong) {
      setError('Medication fields are at most 200 characters each.');
      return;
    }

    const pricing = resolvePricing(mode, catalogItemCode, amountXlm);
    if (!pricing.ok) {
      setError(pricing.error);
      return;
    }

    try {
      const issued = await issuePrescription.mutateAsync({
        consultationId,
        input: {
          facilityProfileId,
          items: items.map(({ drugName, dosage, frequency, duration }) => ({
            drugName: drugName.trim(),
            dosage: dosage.trim(),
            frequency: frequency.trim(),
            duration: duration.trim(),
          })),
          ...pricing.pricing,
        },
      });
      onIssued(issued);
      setItems([newMedicationRow()]);
      setAmountXlm('');
      setCatalogItemCode('');
    } catch {
      // Rendered from the mutation's error below.
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <FacilityField
        type="pharmacy"
        value={facilityProfileId}
        onChange={setFacilityProfileId}
      />

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Medications</legend>
        {items.map((item, index) => (
          <div key={item.key} className={styles.itemCard}>
            <p className={styles.itemHeading}>Medication {index + 1}</p>
            <TextField
              label="Medication"
              value={item.drugName}
              onChange={(event) => updateItem(item.key, { drugName: event.target.value })}
              maxLength={200}
              autoComplete="off"
              required
            />
            <div className={styles.itemGrid}>
              <TextField
                label="Dose"
                value={item.dosage}
                onChange={(event) => updateItem(item.key, { dosage: event.target.value })}
                placeholder="e.g. 500 mg"
                maxLength={200}
                autoComplete="off"
                required
              />
              <TextField
                label="Frequency"
                value={item.frequency}
                onChange={(event) => updateItem(item.key, { frequency: event.target.value })}
                placeholder="e.g. every 8 hours"
                maxLength={200}
                autoComplete="off"
                required
              />
              <TextField
                label="Duration"
                value={item.duration}
                onChange={(event) => updateItem(item.key, { duration: event.target.value })}
                placeholder="e.g. 5 days"
                maxLength={200}
                autoComplete="off"
                required
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => removeItem(item.key)}
              disabled={items.length === 1}
            >
              Remove medication {index + 1}
            </Button>
          </div>
        ))}
        <Button type="button" variant="secondary" onClick={addItem} disabled={items.length >= 100}>
          Add another medication
        </Button>
      </fieldset>

      <PriceFields
        price={{
          mode,
          catalogItemCode,
          amountXlm,
          setMode,
          setCatalogItemCode,
          setAmountXlm,
        }}
      />

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <OrderErrorAlert error={issuePrescription.error} />

      <Button type="submit" loading={issuePrescription.isPending}>
        Issue prescription
      </Button>
    </form>
  );
}

interface TestRow {
  key: number;
  testType: string;
}

function newTestRow(): TestRow {
  return { key: nextKey++, testType: '' };
}

export function LabOrderForm({ consultationId, onIssued }: OrderFormProps) {
  const issueLabOrder = useIssueLabOrder();
  const [facilityProfileId, setFacilityProfileId] = useState('');
  const [tests, setTests] = useState<TestRow[]>([newTestRow()]);
  const [urgency, setUrgency] = useState<LabOrderUrgency>('routine');
  const [notes, setNotes] = useState('');
  const [mode, setMode] = useState<PriceMode>('manual');
  const [catalogItemCode, setCatalogItemCode] = useState('');
  const [amountXlm, setAmountXlm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const updateTest = (key: number, testType: string) => {
    setTests((current) =>
      current.map((test) => (test.key === key ? { ...test, testType } : test)),
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!facilityProfileId) {
      setError('Choose the lab that should run these tests.');
      return;
    }

    const requested = tests.filter((test) => test.testType.trim());
    if (requested.length === 0) {
      setError('Add at least one test.');
      return;
    }
    if (tests.some((test) => test.testType.trim().length > 200)) {
      setError('Test names are at most 200 characters.');
      return;
    }

    const pricing = resolvePricing(mode, catalogItemCode, amountXlm);
    if (!pricing.ok) {
      setError(pricing.error);
      return;
    }

    // docforum-core creates one lab order per test, so a multi-test form is
    // submitted as one request per test and each result is shown as issued.
    let remaining = [...tests];
    for (const test of requested) {
      try {
        const issued = await issueLabOrder.mutateAsync({
          consultationId,
          input: {
            facilityProfileId,
            testType: test.testType.trim(),
            urgency,
            ...(notes.trim() ? { notes: notes.trim() } : {}),
            ...pricing.pricing,
          },
        });
        onIssued(issued);
        remaining = remaining.filter((row) => row.key !== test.key);
        setTests(remaining.length > 0 ? remaining : [newTestRow()]);
      } catch {
        setTests(remaining);
        return;
      }
    }

    setNotes('');
    setAmountXlm('');
    setCatalogItemCode('');
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <FacilityField type="lab" value={facilityProfileId} onChange={setFacilityProfileId} />

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Tests</legend>
        {tests.map((test, index) => (
          <div key={test.key} className={styles.itemCard}>
            <TextField
              label={`Test ${index + 1}`}
              value={test.testType}
              onChange={(event) => updateTest(test.key, event.target.value)}
              placeholder="e.g. Full blood count"
              maxLength={200}
              autoComplete="off"
              required
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setTests((current) =>
                  current.length === 1 ? current : current.filter((row) => row.key !== test.key),
                )
              }
              disabled={tests.length === 1}
            >
              Remove test {index + 1}
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          onClick={() => setTests((current) => (current.length >= 100 ? current : [...current, newTestRow()]))}
          disabled={tests.length >= 100}
        >
          Add another test
        </Button>
      </fieldset>

      <div className={styles.field}>
        <label htmlFor="lab-order-urgency" className={styles.label}>
          Urgency
        </label>
        <select
          id="lab-order-urgency"
          className={styles.select}
          value={urgency}
          onChange={(event) => setUrgency(event.target.value as LabOrderUrgency)}
        >
          <option value="routine">Routine</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor="lab-order-notes" className={styles.label}>
          Instructions for the lab (clinical, stored encrypted)
        </label>
        <textarea
          id="lab-order-notes"
          className={styles.textarea}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={20000}
          rows={3}
          placeholder="Optional clinical instructions (PHI — kept out of logs and analytics)"
        />
      </div>

      <PriceFields
        price={{
          mode,
          catalogItemCode,
          amountXlm,
          setMode,
          setCatalogItemCode,
          setAmountXlm,
        }}
      />

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <OrderErrorAlert error={issueLabOrder.error} />

      <Button type="submit" loading={issueLabOrder.isPending}>
        Issue lab order{tests.filter((test) => test.testType.trim()).length > 1 ? 's' : ''}
      </Button>
    </form>
  );
}

