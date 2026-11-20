import type { MessageAttachmentKind } from '../../types/models';

// Client-side attachment rules. Mirrors what docforum-core validates too —
// this is fast feedback, not the security boundary. SVG is deliberately
// excluded (script injection) along with executables; the server sniffs
// content-type as well (docforum-core#62).

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_ATTACHMENTS_PER_MESSAGE = 5;

export const ALLOWED_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export type AllowedAttachmentType = (typeof ALLOWED_ATTACHMENT_TYPES)[number];

export function attachmentKind(contentType: string): MessageAttachmentKind {
  return contentType === 'application/pdf' ? 'pdf' : 'image';
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Returns a human-readable error message, or null when the file is fine. */
export function validateAttachment(file: File): string | null {
  if (!(ALLOWED_ATTACHMENT_TYPES as readonly string[]).includes(file.type)) {
    return `“${file.name}” isn’t a supported file. Attach a JPEG, PNG, WebP or PDF.`;
  }
  if (file.size === 0) {
    return `“${file.name}” is empty.`;
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return `“${file.name}” is larger than ${formatBytes(MAX_ATTACHMENT_BYTES)}.`;
  }
  return null;
}
