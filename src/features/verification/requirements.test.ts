import { describe, expect, it } from 'vitest';
import {
  ALLOWED_CREDENTIAL_MIME_TYPES,
  MAX_CREDENTIAL_BYTES,
  REQUIRED_CREDENTIALS,
  credentialAcceptAttribute,
  credentialTypeOptions,
  formatBytes,
  isCredentialType,
  uploadPercent,
  validateCredentialFile,
  validateCredentialType,
  validateCredentialUpload,
} from './requirements';

/** Only `size` and `type` matter to the rules, so the byte content stays tiny. */
function fileWith(name: string, type: string, size: number): File {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

const REJECTED_FILES: [string, File | null, RegExp][] = [
  ['nothing chosen', null, /choose a file/i],
  ['an empty file', fileWith('scan.pdf', 'application/pdf', 0), /empty/i],
  ['an oversized PDF', fileWith('license.pdf', 'application/pdf', MAX_CREDENTIAL_BYTES + 1), /smaller/i],
  ['an oversized photo', fileWith('degree.jpeg', 'image/jpeg', 25 * 1024 * 1024), /25 MB/i],
  ['a zip archive', fileWith('degree.zip', 'application/zip', 2048), /only open/i],
  ['a Word document', fileWith('degree.docx', 'application/msword', 2048), /application\/msword/i],
];

const REJECTED_TYPES: [string, string, RegExp][] = [
  ['an empty selection', '', /choose which document type/i],
  ['an invented type', 'hospital_badge', /not a document type/i],
];

const BYTE_LABELS: [number, string][] = [
  [512, '512 B'],
  [2048, '2 KB'],
  [1536, '1.5 KB'],
  [10 * 1024 * 1024, '10 MB'],
  [30 * 1024 * 1024, '30 MB'],
];

const PERCENTS: [number, number, number][] = [
  [0, 1000, 0],
  [500, 1000, 50],
  [999, 1000, 100],
  [1500, 1000, 100],
  [5, 0, 0],
];

describe('required document list', () => {
  it('is the fixed review-policy list', () => {
    expect(REQUIRED_CREDENTIALS.map((requirement) => requirement.type)).toEqual([
      'medical_license',
      'degree_certificate',
      'specialty_certificate',
      'identity_document',
    ]);
  });

  it('never makes the supplementary type required', () => {
    expect(REQUIRED_CREDENTIALS.some((requirement) => requirement.type === 'other')).toBe(false);
  });

  it('gives every requirement a label and an actionable description', () => {
    for (const requirement of REQUIRED_CREDENTIALS) {
      expect(requirement.label.length).toBeGreaterThan(0);
      expect(requirement.description.length).toBeGreaterThan(20);
    }
  });

  it('offers the required types first and the optional one last', () => {
    const options = credentialTypeOptions();
    expect(options.map((option) => option.value)).toEqual([
      'medical_license',
      'degree_certificate',
      'specialty_certificate',
      'identity_document',
      'other',
    ]);
    expect(options[0]?.required).toBe(true);
    expect(options[options.length - 1]?.required).toBe(false);
  });
});

describe('upload rules', () => {
  it('caps credentials at 10 MB', () => {
    expect(MAX_CREDENTIAL_BYTES).toBe(10 * 1024 * 1024);
  });

  it('accepts only the formats a reviewer can open', () => {
    expect([...ALLOWED_CREDENTIAL_MIME_TYPES].sort()).toEqual(['application/pdf', 'image/jpeg', 'image/png']);
    expect(credentialAcceptAttribute()).toBe('application/pdf,image/jpeg,image/png');
  });

  it.each(REJECTED_FILES)('rejects %s before any upload', (_label, file, pattern) => {
    const message = validateCredentialFile(file);
    expect(message).not.toBeNull();
    expect(message).toMatch(pattern);
  });

  it('names the limit and the offending size in the oversize reason', () => {
    const message = validateCredentialFile(fileWith('scan.pdf', 'application/pdf', 30 * 1024 * 1024));
    expect(message).toMatch(/30 MB/);
    expect(message).toMatch(/10 MB/);
  });

  it.each([...ALLOWED_CREDENTIAL_MIME_TYPES])('accepts a permitted type: %s', (mimeType) => {
    expect(validateCredentialFile(fileWith('doc', mimeType, 5 * 1024 * 1024))).toBeNull();
  });

  it('accepts a file exactly at the cap', () => {
    expect(validateCredentialFile(fileWith('edge.pdf', 'application/pdf', MAX_CREDENTIAL_BYTES))).toBeNull();
  });

  it.each(REJECTED_TYPES)('rejects %s as a credential type', (_label, value, pattern) => {
    expect(validateCredentialType(value)).toMatch(pattern);
  });

  it('accepts every credential type the model allows', () => {
    const values = [
      'medical_license',
      'degree_certificate',
      'specialty_certificate',
      'identity_document',
      'other',
    ] as const;
    for (const value of values) {
      expect(validateCredentialType(value)).toBeNull();
      expect(isCredentialType(value)).toBe(true);
    }
  });

  it('reports the file problem ahead of the type problem', () => {
    expect(validateCredentialUpload(fileWith('a.zip', 'application/zip', 1024), '')).toMatch(/only open/i);
    expect(validateCredentialUpload(fileWith('a.pdf', 'application/pdf', 1024), '')).toMatch(/document type/i);
    expect(validateCredentialUpload(null, 'medical_license')).toMatch(/choose a file/i);
    expect(validateCredentialUpload(fileWith('a.pdf', 'application/pdf', 1024), 'medical_license')).toBeNull();
  });
});

describe('byte formatting and progress maths', () => {
  it.each(BYTE_LABELS)('formats %i bytes as %s', (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected);
  });

  it.each(PERCENTS)('reports %i of %i bytes as %i percent', (loaded, total, expected) => {
    expect(uploadPercent(loaded, total)).toBe(expected);
  });
});
