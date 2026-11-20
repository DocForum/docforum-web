// Order issuance against docforum-core's REAL endpoints (issue #267):
// `POST /orders/consultations/:consultationId/prescriptions` and
// `.../lab-orders`. Both are doctor-only and gated on a verified doctor
// profile server-side. Orders are append-only: corrections are new rows
// carrying `supersedesPrescriptionId` / `supersedesLabOrderId`; this client
// never edits an issued order.
import { apiFetch } from './api-client';
import type {
  IssueLabOrderInput,
  IssuePrescriptionInput,
  IssuedLabOrder,
  IssuedPrescription,
} from '../types/models';

export function issuePrescription(
  consultationId: string,
  input: IssuePrescriptionInput,
  accessToken: string,
): Promise<IssuedPrescription> {
  return apiFetch<IssuedPrescription>(
    `/orders/consultations/${consultationId}/prescriptions`,
    { method: 'POST', body: input, accessToken },
  );
}

export function issueLabOrder(
  consultationId: string,
  input: IssueLabOrderInput,
  accessToken: string,
): Promise<IssuedLabOrder> {
  return apiFetch<IssuedLabOrder>(
    `/orders/consultations/${consultationId}/lab-orders`,
    { method: 'POST', body: input, accessToken },
  );
}
