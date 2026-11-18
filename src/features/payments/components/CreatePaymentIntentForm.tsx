import { useState } from 'react';
import { Controller, FormProvider } from 'react-hook-form';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { FormField } from '../../../components/form/FormField';
import { useZodForm } from '../../../hooks/useZodForm';
import { mapServerErrors } from '../../../utils/form';
import { useErrorMessage } from '../../../hooks/useErrorText';
import { useCreatePaymentIntent } from '../hooks/usePaymentIntent';
import { z } from 'zod';
import { ApiError } from '../../../services/api-client';

/**
 * v1 (docforum-core docs/adr/0004 "Consequences"): there's no
 * patient-order table yet, so there's nothing to pick an intent from —
 * this is an explicit admin action with free-text order fields rather
 * than a picker over real orders — Phase 4 doesn't exist yet either.
 */
const createPaymentIntentSchema = z.object({
  orderType: z.enum(['lab_order', 'prescription']),
  orderId: z.string().trim().min(1, 'Order id is required.'),
  patientProfileId: z.string().trim().min(1, 'Patient profile id is required.'),
  facilityId: z.string().trim().min(1, 'Facility id is required.'),
  amountStroops: z.string().trim().min(1, 'Amount (stroops) is required.'),
});

type CreatePaymentIntentFormData = z.infer<typeof createPaymentIntentSchema>;

export function CreatePaymentIntentForm({ onCreated }: { onCreated: (intentId: string) => void }) {
  const form = useZodForm(createPaymentIntentSchema, {
    orderType: 'lab_order',
    orderId: '',
    patientProfileId: '',
    facilityId: '',
    amountStroops: '',
  });
  const createMutation = useCreatePaymentIntent();
  const errorMessage = useErrorMessage();
  const [serverError, setServerError] = useState<string | null>(null);

  async function onSubmit(data: CreatePaymentIntentFormData) {
    setServerError(null);
    try {
      const intent = await createMutation.mutateAsync(data);
      onCreated(intent.id);
    } catch (error) {
      if (error instanceof ApiError) {
        const fieldErrors = mapServerErrors(error.body);
        if (Object.keys(fieldErrors).length > 0) {
          Object.entries(fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof CreatePaymentIntentFormData, { message });
          });
          return;
        }
      }
      setServerError(errorMessage(error));
    }
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="card">
        <h2>Create payment intent</h2>
        <FormError message={serverError} />

        <Controller
          control={form.control}
          name="orderType"
          defaultValue="lab_order"
          render={({ field }) => (
            <label>
              Order type
              <select {...field}>
                <option value="lab_order">Lab order</option>
                <option value="prescription">Prescription</option>
              </select>
            </label>
          )}
        />

        <FormField name="orderId" label="Order id" />
        <FormField name="patientProfileId" label="Patient profile id" />
        <FormField name="facilityId" label="Facility id" />
        <FormField
          name="amountStroops"
          label="Amount (stroops)"
          inputMode="numeric"
          hint="Minor units, e.g. 10000000 = 1.00 XLM."
        />

        <Button type="submit" loading={createMutation.isPending}>
          {createMutation.isPending ? 'Creating…' : 'Create'}
        </Button>
      </form>
    </FormProvider>
  );
}
