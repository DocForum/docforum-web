// The verification requirement list and the client-side upload rules.
//
// Two deliberate choices here: the required-document list is a frontend
// constant (there is no checklist endpoint in docforum-core#52/#51 — it is
// review policy, so the UI says so out loud), and every rule below runs
// before a byte leaves the browser so a doctor never burns a failed upload.
import type { ClaimItemStatus, CredentialType, VerificationStatus } from '../../types/models';

export interface CredentialRequirement {
  type: CredentialType;
  label: string;
  description: string;
}

/** The four items every application is reviewed against. `other` is
 * deliberately absent — supplementary documents are accepted but never
 * required, so they must not hold up verification. */
export const REQUIRED_CREDENTIALS: readonly CredentialRequirement[] = [
  {
    type: 'medical_license',
    label: 'Medical license',
    description: 'Current license to practise, front and back if it is a card.',
  },
  {
    type: 'degree_certificate',
    label: 'Degree certificate',
    description: 'Primary medical degree, or a certified copy of it.',
  },
  {
    type: 'specialty_certificate',
    label: 'Specialty certificate',
    description: 'Proof of the specialty you practise in, matching your specialty claims.',
  },
  {
    type: 'identity_document',
    label: 'Government identity document',
    description: "Passport, national ID, or driver's license. Name must match your account.",
  },
];

export const CREDENTIAL_TYPE_LABELS: Record<CredentialType, string> = {
  medical_license: 'Medical license',
  degree_certificate: 'Degree certificate',
  specialty_certificate: 'Specialty certificate',
  identity_document: 'Government identity document',
  other: 'Other supporting document',
};

/** One status vocabulary for every state the backend can report, so the
 * checklist, the credential list and the claim picker never describe the same
 * state three different ways — and never describe it by colour alone. */
export const CLAIM_ITEM_STATUS_LABELS: Record<ClaimItemStatus, string> = {
  pending: 'Pending review',
  verified: 'Verified',
  rejected: 'Rejected',
};

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  pending: 'Application pending',
  verified: 'Doctor verified',
  rejected: 'Application rejected',
};

/** The checklist state with no backend row behind it yet — nothing was
 * submitted, so there is no review status to report. */
export const NOT_SUBMITTED_LABEL = 'Not submitted yet';

/** Some backends reject an item without a note; the row still has to say what
 * to do next rather than render an empty reason. */
export const NO_REJECTION_REASON =
  'No reason was recorded. Check the requirements above, then resubmit a document that meets them.';

/** 10 MB: the Render preview backend caps request bodies, and reviewers open
 * these on phones — a bigger scan uploads slower and reads worse than a
 * compressed one. */
export const MAX_CREDENTIAL_BYTES = 10 * 1024 * 1024;

/** PDF plus the two formats every phone camera and scanner exports. The
 * review queue cannot open anything else (a Word doc or raw TIFF has no
 * fixed rendering), so those are refused before upload rather than rejected
 * after a human waits on them. */
export const ALLOWED_CREDENTIAL_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;

export type AllowedCredentialMimeType = (typeof ALLOWED_CREDENTIAL_MIME_TYPES)[number];

const ALLOWED_TYPE_LABELS: Record<AllowedCredentialMimeType, string> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
};

export const CREDENTIAL_TYPE_HINT = `PDF, JPEG, or PNG, up to ${formatBytes(MAX_CREDENTIAL_BYTES)}.`;

export function credentialAcceptAttribute(): string {
  return ALLOWED_CREDENTIAL_MIME_TYPES.join(',');
}

export function credentialTypeOptions(): { value: CredentialType; label: string; required: boolean }[] {
  const required = REQUIRED_CREDENTIALS.map((requirement) => ({
    value: requirement.type,
    label: requirement.label,
    required: true,
  }));
  const optional: CredentialType[] = ['other'];
  return [
    ...required,
    ...optional.map((type) => ({ value: type, label: CREDENTIAL_TYPE_LABELS[type], required: false })),
  ];
}

export function isCredentialType(value: string): value is CredentialType {
  return (Object.keys(CREDENTIAL_TYPE_LABELS) as CredentialType[]).includes(value as CredentialType);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'] as const;
  let value = bytes / 1024;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  const digits = value >= 10 ? 0 : 1;
  // "2.0 KB" reads like a measurement instrument; "2 KB" reads like a label.
  const text = value.toFixed(digits);
  return `${text.endsWith('.0') ? text.slice(0, -2) : text} ${units[index]}`;
}

export function uploadPercent(loadedBytes: number, totalBytes: number): number {
  if (totalBytes <= 0) return 0;
  return Math.min(100, Math.round((loadedBytes / totalBytes) * 100));
}

/** File rules, in the order a doctor can actually violate them. */
export function validateCredentialFile(file: File | null): string | null {
  if (!file) return 'Choose a file to upload.';
  if (file.size === 0) return 'That file is empty. Upload the document itself, not a shortcut or placeholder.';
  if (file.size > MAX_CREDENTIAL_BYTES) {
    return `${file.name || 'That file'} is ${formatBytes(file.size)}. Documents must be ${formatBytes(
      MAX_CREDENTIAL_BYTES,
    )} or smaller — export a compressed PDF or a lower-resolution photo instead.`;
  }
  if (!(ALLOWED_CREDENTIAL_MIME_TYPES as readonly string[]).includes(file.type)) {
    const readable = ALLOWED_CREDENTIAL_MIME_TYPES.map((type) => ALLOWED_TYPE_LABELS[type]).join(', ');
    return `${file.name || 'That file'} is ${file.type || 'an unrecognised type'}. Reviewers can only open ${readable}.`;
  }
  return null;
}

export function validateCredentialType(value: string): string | null {
  if (!value) return 'Choose which document type you are uploading.';
  if (!isCredentialType(value)) return `"${value}" is not a document type this application accepts.`;
  return null;
}

export function validateCredentialUpload(file: File | null, type: string): string | null {
  return validateCredentialFile(file) ?? validateCredentialType(type);
}
