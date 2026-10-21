import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../services/api-client';
import * as messagingService from '../../../services/messaging-service';
import { useAuthStore } from '../../../store/auth-store';
import type { MessageAttachment } from '../../../types/models';
import { MAX_ATTACHMENTS_PER_MESSAGE, validateAttachment } from '../attachment-validation';
import { prepareImageForUpload } from '../image-utils';

export type StagedUploadStatus = 'uploading' | 'done' | 'error' | 'cancelled';

export interface StagedAttachment {
  id: string;
  file: File;
  fileName: string;
  status: StagedUploadStatus;
  progress: number;
  attachment?: MessageAttachment;
  error?: string;
}

function makeId(): string {
  const cryptoRef = globalThis.crypto;
  if (cryptoRef && typeof cryptoRef.randomUUID === 'function') return cryptoRef.randomUUID();
  return `att-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Owns the staged-attachment lifecycle for one composer: pick/capture →
 * validate → client-side downscale → upload with progress → cancel / retry.
 * In-memory only (drafts are PHI — no localStorage), and the AbortControllers
 * are torn down on unmount. */
export function useAttachmentUploader(threadId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [items, setItems] = useState<StagedAttachment[]>([]);
  const controllers = useRef(new Map<string, AbortController>());

  useEffect(() => {
    const active = controllers.current;
    return () => {
      active.forEach((controller) => controller.abort());
      active.clear();
    };
  }, []);

  const patchItem = useCallback((id: string, patch: Partial<StagedAttachment>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const startUpload = useCallback(
    async (item: StagedAttachment) => {
      if (!accessToken) {
        patchItem(item.id, { status: 'error', error: 'You need to be signed in to upload.' });
        return;
      }
      const controller = new AbortController();
      controllers.current.set(item.id, controller);
      patchItem(item.id, { status: 'uploading', progress: 0, error: undefined });

      try {
        const prepared = await prepareImageForUpload(item.file);
        const attachment = await messagingService.uploadAttachment(threadId, prepared, accessToken, {
          signal: controller.signal,
          onProgress: (progress) => patchItem(item.id, { progress }),
        });
        patchItem(item.id, { status: 'done', progress: 100, attachment, fileName: attachment.fileName });
      } catch (error) {
        if (error instanceof ApiError && error.cancelled) {
          patchItem(item.id, { status: 'cancelled', progress: 0 });
        } else {
          patchItem(item.id, {
            status: 'error',
            error: error instanceof ApiError ? error.message : 'Upload failed. Please try again.',
          });
        }
      } finally {
        controllers.current.delete(item.id);
      }
    },
    [accessToken, patchItem, threadId],
  );

  const addFiles = useCallback(
    (files: File[]) => {
      let room = MAX_ATTACHMENTS_PER_MESSAGE - items.length;
      const accepted: StagedAttachment[] = [];
      const rejected: StagedAttachment[] = [];

      files.forEach((file) => {
        const base = { id: makeId(), file, fileName: file.name, progress: 0 };
        const validationError = validateAttachment(file);
        if (validationError) {
          rejected.push({ ...base, status: 'error', error: validationError });
          return;
        }
        if (room <= 0) {
          rejected.push({
            ...base,
            status: 'error',
            error: `You can attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files per message.`,
          });
          return;
        }
        room -= 1;
        accepted.push({ ...base, status: 'uploading' });
      });

      if (accepted.length || rejected.length) {
        setItems((prev) => [...prev, ...rejected, ...accepted]);
      }
      accepted.forEach((item) => void startUpload(item));
    },
    [items.length, startUpload],
  );

  const cancelUpload = useCallback((id: string) => {
    controllers.current.get(id)?.abort();
  }, []);

  const retryUpload = useCallback(
    (id: string) => {
      const item = items.find((candidate) => candidate.id === id);
      if (item) void startUpload(item);
    },
    [items, startUpload],
  );

  const removeAttachment = useCallback((id: string) => {
    controllers.current.get(id)?.abort();
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const reset = useCallback(() => {
    controllers.current.forEach((controller) => controller.abort());
    controllers.current.clear();
    setItems([]);
  }, []);

  const uploadedIds = items
    .filter((item) => item.status === 'done' && item.attachment)
    .map((item) => item.attachment!.id);

  return {
    items,
    addFiles,
    cancelUpload,
    retryUpload,
    removeAttachment,
    reset,
    uploadedIds,
    isUploading: items.some((item) => item.status === 'uploading'),
    hasErrors: items.some((item) => item.status === 'error'),
    isAtCapacity: items.length >= MAX_ATTACHMENTS_PER_MESSAGE,
  };
}
