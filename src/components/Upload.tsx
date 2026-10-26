import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { apiUploadFile } from '../services/api-client';
import type { UploadProgress } from '../services/api-client';
import { downscaleImage } from './image-downscale';
import type { DownscaleOptions } from './image-downscale';
import { formatBytes, validateFile } from './upload-utils';
import styles from './Upload.module.css';

export interface UploadResult {
  id?: string;
  url?: string;
  [key: string]: unknown;
}

export interface UploadHelpers {
  onProgress: (progress: UploadProgress) => void;
  signal: AbortSignal;
}

export type UploadFileFn = (file: File, helpers: UploadHelpers) => Promise<UploadResult>;

export interface UploadProps {
  /** POST target on the core API. Assumed contract: multipart with `file`. */
  endpoint?: string;
  fieldName?: string;
  fields?: Record<string, string>;
  accessToken?: string | null;
  uploadFile?: UploadFileFn;
  label?: string;
  hint?: string;
  accept?: string;
  maxBytes?: number;
  multiple?: boolean;
  allowCamera?: boolean;
  disabled?: boolean;
  downscale?: (file: File, options: DownscaleOptions) => Promise<File>;
  downscaleOptions?: DownscaleOptions;
  onUploaded?: (file: File, result: UploadResult) => void;
  onRemove?: (itemId: string) => void;
}

type ItemStatus = 'validating' | 'ready' | 'uploading' | 'success' | 'error' | 'cancelled';

interface UploadItem {
  id: string;
  file: File;
  previewUrl?: string;
  status: ItemStatus;
  progress: number;
  error?: string;
  result?: UploadResult;
}

const DEFAULT_ACCEPT = '.jpg,.jpeg,.png,.webp,.gif,.pdf,image/*,application/pdf';
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;

let fallbackId = 0;
function nextId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  fallbackId += 1;
  return `upload-${fallbackId}`;
}

export function Upload({
  endpoint = '/uploads',
  fieldName = 'file',
  fields,
  accessToken,
  uploadFile,
  label = 'Upload files',
  hint,
  accept = DEFAULT_ACCEPT,
  maxBytes = DEFAULT_MAX_BYTES,
  multiple = true,
  allowCamera = true,
  disabled = false,
  downscale = downscaleImage,
  downscaleOptions,
  onUploaded,
  onRemove,
}: UploadProps) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const controllers = useRef(new Map<string, AbortController>());
  const itemsRef = useRef(items);
  const dragDepth = useRef(0);

  itemsRef.current = items;

  useEffect(
    () => () => {
      for (const controller of controllers.current.values()) controller.abort();
      for (const item of itemsRef.current) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }
    },
    [],
  );

  const updateItem = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const beginUpload = useCallback(
    async (id: string, file: File) => {
      const controller = new AbortController();
      controllers.current.set(id, controller);
      updateItem(id, { status: 'uploading', progress: 0, error: undefined });

      const send =
        uploadFile ??
        ((uploading: File, helpers: UploadHelpers) =>
          apiUploadFile<UploadResult>(endpoint, uploading, {
            fieldName,
            fields,
            accessToken,
            signal: helpers.signal,
            onProgress: helpers.onProgress,
          }));

      try {
        const result = await send(file, {
          signal: controller.signal,
          onProgress: (progress) =>
            setItems((current) =>
              current.map((item) =>
                item.id === id && progress.percent - item.progress >= 5
                  ? { ...item, progress: progress.percent }
                  : item,
              ),
            ),
        });
        controllers.current.delete(id);
        updateItem(id, { status: 'success', progress: 100, result });
        setAnnouncement(`${file.name} uploaded.`);
        onUploaded?.(file, result);
      } catch (error) {
        controllers.current.delete(id);
        if (controller.signal.aborted) {
          updateItem(id, { status: 'cancelled', progress: 0 });
          setAnnouncement(`${file.name} upload cancelled.`);
        } else {
          const message = error instanceof Error ? error.message : 'Upload failed.';
          updateItem(id, { status: 'error', error: message });
          setAnnouncement(`${file.name} failed to upload: ${message}`);
        }
      }
    },
    [accessToken, endpoint, fieldName, fields, onUploaded, updateItem, uploadFile],
  );

  const addFiles = useCallback(
    async (incoming: File[]) => {
      if (disabled || incoming.length === 0) return;
      const selected = multiple ? incoming : incoming.slice(0, 1);
      if (!multiple) {
        for (const controller of controllers.current.values()) controller.abort();
        controllers.current.clear();
        for (const item of itemsRef.current) {
          if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        }
        setItems([]);
      }

      setAnnouncement(selected.length === 1 ? 'Checking 1 file.' : `Checking ${selected.length} files.`);

      for (const file of selected) {
        const id = nextId();
        const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
        setItems((current) => [
          ...current,
          { id, file, previewUrl, status: 'validating', progress: 0 },
        ]);

        const validation = await validateFile(file, { accept, maxBytes });
        if (!validation.ok) {
          updateItem(id, { status: 'error', error: validation.error });
          setAnnouncement(`${file.name}: ${validation.error}`);
          continue;
        }

        let processed = file;
        if (file.type.startsWith('image/')) {
          try {
            processed = await downscale(file, downscaleOptions ?? {});
          } catch {
            processed = file;
          }
          if (processed.size > maxBytes) {
            updateItem(id, {
              status: 'error',
              error: `The file is larger than ${formatBytes(maxBytes)} even after resizing.`,
            });
            continue;
          }
        }

        updateItem(id, { file: processed, status: 'ready' });
        void beginUpload(id, processed);
      }
    },
    [accept, beginUpload, disabled, downscale, downscaleOptions, maxBytes, multiple, updateItem],
  );

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    void addFiles(files);
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (disabled) return;
    dragDepth.current += 1;
    setDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (disabled) return;
    void addFiles(Array.from(event.dataTransfer?.files ?? []));
  };

  const cancel = (item: UploadItem) => {
    controllers.current.get(item.id)?.abort();
    updateItem(item.id, { status: 'cancelled', progress: 0 });
    setAnnouncement(`${item.file.name} upload cancelled.`);
  };

  const remove = (item: UploadItem) => {
    controllers.current.get(item.id)?.abort();
    controllers.current.delete(item.id);
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    onRemove?.(item.id);
  };

  const retry = (item: UploadItem) => {
    void beginUpload(item.id, item.file);
  };

  const describedBy = hint ? hintId : undefined;

  return (
    <section className={styles.upload} aria-label={label}>
      <div
        className={`${styles.dropzone} ${dragging ? styles.dragging : ''} ${disabled ? styles.disabledZone : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <p className={styles.dropText}>
          Drag and drop files here, or
        </p>
        <div className={styles.buttons}>
          <button
            type="button"
            className={styles.choose}
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            aria-describedby={describedBy}
          >
            Choose files
          </button>
          {allowCamera && accept.includes('image') && (
            <button
              type="button"
              className={styles.chooseSecondary}
              onClick={() => cameraInputRef.current?.click()}
              disabled={disabled}
            >
              Take photo
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          id={inputId}
          className={styles.input}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={handleInput}
          data-testid="upload-input"
        />
        {allowCamera && accept.includes('image') && (
          <input
            ref={cameraInputRef}
            className={styles.input}
            type="file"
            accept="image/*"
            capture="environment"
            disabled={disabled}
            onChange={handleInput}
            data-testid="upload-camera-input"
          />
        )}
        {hint && (
          <p id={hintId} className={styles.hint}>
            {hint}
          </p>
        )}
        <p className={styles.hint}>
          Up to {formatBytes(maxBytes)} per file. Images are resized before upload.
        </p>
      </div>

      <p className={styles.live} role="status" aria-live="polite">
        {announcement}
      </p>

      {items.length > 0 && (
        <ul className={styles.list} aria-label="Selected files">
          {items.map((item) => (
            <li key={item.id} className={styles.item}>
              {item.previewUrl ? (
                <img src={item.previewUrl} alt="" className={styles.preview} />
              ) : (
                <span className={styles.fileIcon} aria-hidden="true">
                  {item.file.name.split('.').pop()?.toUpperCase().slice(0, 4) ?? 'FILE'}
                </span>
              )}
              <div className={styles.details}>
                <p className={styles.name} title={item.file.name}>
                  {item.file.name}
                </p>
                <p className={styles.meta}>
                  <span>{formatBytes(item.file.size)}</span> · <span>{statusLabel(item)}</span>
                </p>
                {item.status === 'uploading' && (
                  <progress
                    className={styles.progress}
                    value={item.progress}
                    max={100}
                    aria-label={`Upload progress for ${item.file.name}`}
                    aria-valuetext={`${item.progress}%`}
                  />
                )}
                {item.error && (
                  <p className={styles.error} role="alert">
                    {item.error}
                  </p>
                )}
              </div>
              <div className={styles.actions}>
                {item.status === 'uploading' && (
                  <button type="button" className={styles.action} onClick={() => cancel(item)}>
                    Cancel
                  </button>
                )}
                {(item.status === 'error' || item.status === 'cancelled') && (
                  <button type="button" className={styles.action} onClick={() => retry(item)}>
                    Retry
                  </button>
                )}
                <button
                  type="button"
                  className={styles.action}
                  onClick={() => remove(item)}
                  aria-label={`Remove ${item.file.name}`}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function statusLabel(item: UploadItem): string {
  switch (item.status) {
    case 'validating':
      return 'Checking…';
    case 'ready':
      return 'Ready';
    case 'uploading':
      return `Uploading ${item.progress}%`;
    case 'success':
      return 'Uploaded';
    case 'cancelled':
      return 'Cancelled';
    case 'error':
      return 'Failed';
  }
}
