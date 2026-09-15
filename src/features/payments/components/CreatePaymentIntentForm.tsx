import { useState } from 'react';
import type { FormEvent } from 'react';
import { TextField } from '../../../components/TextField';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { ApiError } from '../../../services/api-client';
import { useCreatePaymentIntent } from '../hooks/usePaymentIntent';
import type { OrderTypeForPayment } from '../../../types/models';

/**
 * v1 (docforum-core docs/adr/0004 "Consequences"): there's no
 * FulfillmentRecord yet to create a PaymentIntent automatically from, so
 * this is an explicit admin action with free-text order fields rather
 * than a picker over real orders — Phase 4 doesn't exist yet either.
 */
export function CreatePaymentIntentForm({ onCreated }: { onCreated: (intentId: string) => void }) {
  const [orderType, setOrderType] = useState<OrderTypeForPayment>('lab_order');
  const [orderId, setOrderId] = useState('');
  const [patientProfileId, setPatientProfileId] = useState('');
  const [facilityId, setFacilityId] = useState('');
  const [amountStroops, setAmountStroops] = useState('');
  const createMutation = useCreatePaymentIntent();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createMutation.mutate(
      { orderType, orderId, patientProfileId, facilityId, amountStroops },
      { onSuccess: (intent) => onCreated(intent.id) },
    );
  }

  const submitError =
    createMutation.error instanceof ApiError
      ? createMutation.error.message
      : createMutation.error
        ? 'Something went wrong. Please try again.'
        : null;

  return (
    <form onSubmit={handleSubmit} noValidate className="card">
      <h2>Create payment intent</h2>
      <FormError message={submitError} />

      <label>
        Order type
        <select value={orderType} onChange={(e) => setOrderType(e.target.value as OrderTypeForPayment)}>
          <option value="lab_order">Lab order</option>
          <option value="prescription">Prescription</option>
        </select>
      </label>

      <TextField label="Order id" value={orderId} onChange={(e) => setOrderId(e.target.value)} required />
      <TextField
        label="Patient profile id"
        value={patientProfileId}
        onChange={(e) => setPatientProfileId(e.target.value)}
        required
      />
      <TextField label="Facility id" value={facilityId} onChange={(e) => setFacilityId(e.target.value)} required />
      <TextField
        label="Amount (stroops)"
        inputMode="numeric"
        value={amountStroops}
        onChange={(e) => setAmountStroops(e.target.value)}
        required
      />

      <Button type="submit" loading={createMutation.isPending}>
        {createMutation.isPending ? 'Creating…' : 'Create'}
      </Button>
    </form>
  );
}
