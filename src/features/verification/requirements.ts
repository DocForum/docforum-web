// The verification requirement list and the client-side upload rules.
//
// Two deliberate choices here: the required-document list is a frontend
// constant (there is no checklist endpoint in docforum-core#52/#51 — it is
// review policy, so the UI says so out loud), and every rule below runs
// before a byte leaves the browser so a doctor never burns a failed upload.
import { plainTranslate, type Translate } from '../../i18n/useT';
import type { ClaimItemStatus, CredentialType, VerificationStatus } from '../../types/models';

export interface CredentialRequirement {
  type: CredentialType;
  label: string;
  description: string;
}

/** The four items every application is reviewed against. `other` is
 * deliberately absent — supplementary documents are accepted but never
 * required, so they must not hold up verification. */
export function localizedRequirements(t: Translate): CredentialRequirement[] {
  return [
    {
      type: 'medical_license',
      label: t('verification.requirement.medical_license.label', 'Medical license'),
      description: t(
        'verification.requirement.medical_license.description',
        'Current license to practise, front and back if it is a card.',
      ),
    },
    {
      type: 'degree_certificate',
      label: t('verification.requirement.degree_certificate.label', 'Degree certificate'),
      description: t(
        'verification.requirement.degree_certificate.description',
        'Primary medical degree, or a certified copy of it.',
      ),
    },
    {
      type: 'specialty_certificate',
      label: t('verification.requirement.specialty_certificate.label', 'Specialty certificate'),
      description: t(
        'verification.requirement.specialty_certificate.description',
        'Proof of the specialty you practise in, matching your specialty claims.',
      ),
    },
    {
      type: 'identity_document',
      label: t('verification.requirement.identity_document.label', 'Government identity document'),
      description: t(
        'verification.requirement.identity_document.description',
        "Passport, national ID, or driver's license. Name must match your account.",
      ),
    },
  ];
}

/** English snapshot kept for callers outside a provider (tests, pure maths). */
export const REQUIRED_CREDENTIALS: readonly CredentialRequirement[] = localizedRequirements(plainTranslate);

function localizedCredentialTypeLabels(t: Translate): Record<CredentialType, string> {
  return {
    medical_license: t('verification.requirement.medical_license.label', 'Medical license'),
    degree_certificate: t('verification.requirement.degree_certificate.label', 'Degree certificate'),
    specialty_certificate: t('verification.requirement.specialty_certificate.label', 'Specialty certificate'),
    identity_document: t('verification.requirement.identity_document.label', 'Government identity document'),
    other: t('verification.requirement.other.label', 'Other supporting document'),
  };
}

export const CREDENTIAL_TYPE_LABELS: Record<CredentialType, string> =
  localizedCredentialTypeLabels(plainTranslate);

export function credentialTypeLabel(type: CredentialType, t: Translate): string {
  return localizedCredentialTypeLabels(t)[type];
}

/** One status vocabulary for every state the backend can report, so the
 * checklist, the credential list and the claim picker never describe the same
 * state three different ways — and never describe it by colour alone. */
function localizedClaimItemStatusLabels(t: Translate): Record<ClaimItemStatus, string> {
  return {
    pending: t('verification.status.pending', 'Pending review'),
    verified: t('verification.status.verified', 'Verified'),
    rejected: t('verification.status.rejected', 'Rejected'),
  };
}

export const CLAIM_ITEM_STATUS_LABELS: Record<ClaimItemStatus, string> =
  localizedClaimItemStatusLabels(plainTranslate);

export function claimItemStatusLabel(status: ClaimItemStatus, t: Translate): string {
  return localizedClaimItemStatusLabels(t)[status];
}

function localizedVerificationStatusLabels(t: Translate): Record<VerificationStatus, string> {
  return {
    pending: t('verification.status.application_pending', 'Application pending'),
    verified: t('verification.status.doctor_verified', 'Doctor verified'),
    rejected: t('verification.status.application_rejected', 'Application rejected'),
  };
}

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> =
  localizedVerificationStatusLabels(plainTranslate);

export function verificationStatusLabel(status: VerificationStatus, t: Translate): string {
  return localizedVerificationStatusLabels(t)[status];
}

/** The checklist state with no backend row behind it yet — nothing was
 * submitted, so there is no review status to report. */
export function notSubmittedLabel(t: Translate): string {
  return t('verification.status.not_submitted', 'Not submitted yet');
}

export const NOT_SUBMITTED_LABEL: string = notSubmittedLabel(plainTranslate);

/** Some backends reject an item without a note; the row still has to say what
 * to do next rather than render an empty reason. */
export function noRejectionReason(t: Translate): string {
  return t(
    'verification.reason.none',
    'No reason was recorded. Check the requirements above, then resubmit a document that meets them.',
  );
}

export const NO_REJECTION_REASON: string = noRejectionReason(plainTranslate);

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

// File-format names are international identifiers, not translatable copy.
const ALLOWED_TYPE_LABELS: Record<AllowedCredentialMimeType, string> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
};

export function credentialTypeHint(t: Translate = plainTranslate): string {
  return t('verification.upload.typeHint', 'PDF, JPEG, or PNG, up to {max}.', {
    max: formatBytes(MAX_CREDENTIAL_BYTES),
  });
}

export const CREDENTIAL_TYPE_HINT: string = credentialTypeHint();

export function credentialAcceptAttribute(): string {
  return ALLOWED_CREDENTIAL_MIME_TYPES.join(',');
}

export function credentialTypeOptions(t: Translate = plainTranslate): {
  value: CredentialType;
  label: string;
  required: boolean;
}[] {
  const required = localizedRequirements(t).map((requirement) => ({
    value: requirement.type,
    label: requirement.label,
    required: true,
  }));
  const optional: CredentialType[] = ['other'];
  return [
    ...required,
    ...optional.map((type) => ({ value: type, label: credentialTypeLabel(type, t), required: false })),
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
export function validateCredentialFile(file: File | null, t: Translate = plainTranslate): string | null {
  if (!file) return t('verification.upload.fileRequired', 'Choose a file to upload.');
  if (file.size === 0) {
    return t(
      'verification.upload.fileEmpty',
      'That file is empty. Upload the document itself, not a shortcut or placeholder.',
    );
  }
  if (file.size > MAX_CREDENTIAL_BYTES) {
    return t(
      'verification.upload.tooLarge',
      '{name} is {size}. Documents must be {limit} or smaller — export a compressed PDF or a lower-resolution photo instead.',
      {
        name: file.name || t('verification.upload.thatFile', 'That file'),
        size: formatBytes(file.size),
        limit: formatBytes(MAX_CREDENTIAL_BYTES),
      },
    );
  }
  if (!(ALLOWED_CREDENTIAL_MIME_TYPES as readonly string[]).includes(file.type)) {
    const readable = ALLOWED_CREDENTIAL_MIME_TYPES.map((type) => ALLOWED_TYPE_LABELS[type]).join(', ');
    return t('verification.upload.wrongType', '{name} is {type}. Reviewers can only open {formats}.', {
      name: file.name || t('verification.upload.thatFile', 'That file'),
      type: file.type || t('verification.upload.unrecognisedType', 'an unrecognised type'),
      formats: readable,
    });
  }
  return null;
}

export function validateCredentialType(value: string, t: Translate = plainTranslate): string | null {
  if (!value) return t('verification.upload.typeRequired', 'Choose which document type you are uploading.');
  if (!isCredentialType(value)) {
    return t('verification.upload.typeInvalid', '"{value}" is not a document type this application accepts.', {
      value,
    });
  }
  return null;
}

export function validateCredentialUpload(
  file: File | null,
  type: string,
  t: Translate = plainTranslate,
): string | null {
  return validateCredentialFile(file, t) ?? validateCredentialType(type, t);
}
