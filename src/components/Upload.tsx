import { useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { apiUpload } from '../services/api-client';
import { Button } from './Button';
import {
  DEFAULT_IMAGE_MAX_DIMENSION,
  DEFAULT_IMAGE_QUALITY,
  DEFAULT_MAX_UPLOAD_BYTES,
  downscaleImage,
  formatBytes,
  validateUploadFile,
} from './upload-utils';
import styles from './Upload.module.css';

export type UploadStatus = 'queued' | 'uploading' | 'done' | 'error' | 'cancelled';

export interface UploadContext {
  onProgress: (percent: number) => void;
  signal: AbortSignal;
}

export type UploadTransport = (file: File, context: UploadContext) => Promise<unknown>;

export interface UploadProps {
  endpoint?: string;
  uploadFile?: UploadTransport;
  accessToken?: string | null;
  fieldName?: string;
  accept?: string;
  maxSizeBytes?: number;
  multiple?: boolean;
  capture?: 'environment' | 'user' | false;
  imageMaxDimension?: number;
  imageQuality?: number;
  label?: string;
  hint?: string;
  onUploaded?: (result: unknown, file: File) => void;
}

interface UploadItem {
  id: string;
  file: File;
  name: string;
  size: number;
  status: UploadStatus;
  progress: number;
  error?: string;
}

const STATUS_LABEL: Record<UploadStatus, string> = {
  queued: 'Queued',
  uploading: 'Uploading',
  done: 'Uploaded',
  error: 'Upload failed',
  cancelled: 'Cancelled',
};

function messageFor(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'Upload failed.';
}

export function Upload({
  endpoint,
  uploadFile,
  accessToken,
  fieldName = 'file',
  accept = 'image/*,application/pdf',
  maxSizeBytes = DEFAULT_MAX_UPLOAD_BYTES,
  multiple = false,
  capture = 'environment',
  imageMaxDimension = DEFAULT_IMAGE_MAX_DIMENSION,
  imageQuality = DEFAULT_IMAGE_QUALITY,
  label = 'Upload a file',
  hint,
  onUploaded,
}: UploadProps) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const controllers = useRef(new Map<string, AbortController>());
  const nextId = useRef(0);

  const updateItem = (id: string, patch: Partial<UploadItem>) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const transport: UploadTransport =
    uploadFile ??
    ((file, { onProgress, signal }) => {
      if (!endpoint) {
        return Promise.reject(new Error('No upload endpoint configured.'));
      }
      const body = new FormData();
      body.append(fieldName, file);
      return apiUpload(endpoint, body, { accessToken, onProgress, signal });
    });

  const beginUpload = async (item: UploadItem) => {
    const controller = new AbortController();
    controllers.current.set(item.id, controller);
    const isCurrent = () => controllers.current.get(item.id) === controller;
    updateItem(item.id, { status: 'uploading', progress: 0, error: undefined });

    try {
      const result = await transport(item.file, {
        signal: controller.signal,
        onProgress: (percent) => {
          if (!isCurrent()) return;
          const clamped = Math.max(0, Math.min(100, Math.round(percent)));
          updateItem(item.id, { progress: clamped });
        },
      });

      if (!isCurrent()) return;
      if (controller.signal.aborted) {
        updateItem(item.id, { status: 'cancelled' });
        return;
      }
      updateItem(item.id, { status: 'done', progress: 100 });
      try {
        onUploaded?.(result, item.file);
      } catch {
        return;
      }
    } catch (error) {
      if (!isCurrent()) return;
      if (controller.signal.aborted) {
        updateItem(item.id, { status: 'cancelled' });
      } else {
        updateItem(item.id, { status: 'error', error: messageFor(error) });
      }
    } finally {
      if (isCurrent()) controllers.current.delete(item.id);
    }
  };

  const addFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;

    const chosen = Array.from(list);
    const accepted = multiple ? chosen : chosen.slice(0, 1);

    for (const file of accepted) {
      const id = `upload-${++nextId.current}`;
      try {
        const validated = await validateUploadFile(file, { accept, maxSizeBytes });
        const prepared = await downscaleImage(validated.file, {
          maxDimension: imageMaxDimension,
          quality: imageQuality,
        });
        const item: UploadItem = {
          id,
          file: prepared,
          name: prepared.name,
          size: prepared.size,
          status: 'queued',
          progress: 0,
        };
        setItems((current) => [...current, item]);
        void beginUpload(item);
      } catch (error) {
        setItems((current) => [
          ...current,
          {
            id,
            file,
            name: file.name,
            size: file.size,
            status: 'error',
            progress: 0,
            error: messageFor(error),
          },
        ]);
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    void addFiles(event.target.files);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void addFiles(event.dataTransfer.files);
  };

  const cancel = (id: string) => {
    updateItem(id, { status: 'cancelled' });
    controllers.current.get(id)?.abort();
  };

  const retry = (id: string) => {
    const item = items.find((candidate) => candidate.id === id);
    if (!item) return;
    const retried: UploadItem = { ...item, status: 'queued', progress: 0, error: undefined };
    updateItem(id, { status: 'queued', progress: 0, error: undefined });
    void beginUpload(retried);
  };

  return (
    <div className={styles.upload}>
      <div
        className={`${styles.dropzone} ${dragging ? styles.dropzoneActive : ''}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          const next = event.relatedTarget;
          if (next instanceof Node && event.currentTarget.contains(next)) return;
          setDragging(false);
        }}
        onDrop={onDrop}
        data-testid="upload-dropzone"
      >
        <p className={styles.title}>{label}</p>
        <p className={styles.hint}>
          {hint ?? `Drag files here, or choose them. Images and PDFs up to ${formatBytes(maxSizeBytes)}.`}
        </p>

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
            Choose files
          </Button>
          {capture !== false && (
            <Button type="button" variant="secondary" onClick={() => cameraInputRef.current?.click()}>
              Take photo
            </Button>
          )}
        </div>

        <input
          ref={fileInputRef}
          className={styles.hiddenInput}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={onInputChange}
          tabIndex={-1}
          aria-hidden="true"
        />
        {capture !== false && (
          <input
            ref={cameraInputRef}
            className={styles.hiddenInput}
            type="file"
            accept="image/*"
            capture={capture}
            onChange={onInputChange}
            tabIndex={-1}
            aria-hidden="true"
          />
        )}
      </div>

      {items.length > 0 && (
        <ul className={styles.list} aria-label="Uploads">
          {items.map((item) => {
            const statusText =
              item.status === 'error' && item.error ? item.error : STATUS_LABEL[item.status];
            return (
              <li key={item.id} className={styles.item}>
                <div className={styles.itemHeader}>
                  <span className={styles.itemName}>{item.name}</span>
                  <span className={styles.itemSize}>{formatBytes(item.size)}</span>
                  <span className={styles.itemStatus} data-status={item.status}>
                    {item.status === 'uploading' ? `${item.progress}%` : STATUS_LABEL[item.status]}
                  </span>
                </div>

                <progress
                  className={styles.progress}
                  max={100}
                  value={item.status === 'done' ? 100 : item.progress}
                  aria-label={`Upload progress for ${item.name}`}
                />

                {item.status !== 'error' && (
                  <span className={styles.srOnly} aria-live="polite">
                    {item.name}: {statusText}
                  </span>
                )}

                {item.status === 'error' && (
                  <p className={styles.error} role="alert">
                    {item.error}
                  </p>
                )}

                <div className={styles.itemActions}>
                  {item.status === 'uploading' && (
                    <button type="button" className={styles.textButton} onClick={() => cancel(item.id)}>
                      Cancel
                    </button>
                  )}
                  {(item.status === 'error' || item.status === 'cancelled') && (
                    <button type="button" className={styles.textButton} onClick={() => retry(item.id)}>
                      Retry
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
