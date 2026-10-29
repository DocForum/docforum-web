import { useMemo, useState } from 'react';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/states/EmptyState';
import { InlineError } from '../../../components/states/InlineError';
import { queryErrorMessage } from '../../../components/states/QueryState';
import { Skeleton } from '../../../components/states/Skeleton';
import type {
  FulfillmentLabResult,
  FulfillmentQueueItem,
  FulfillmentStatusUpdate,
} from '../../../types/models';
import {
  useFacilityQueue,
  useUpdateFulfillmentStatus,
  useUploadLabResult,
} from '../hooks/useFacilityQueue';
import styles from './FacilityQueuePanel.module.css';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

type QueueFilter = 'all' | 'active' | 'done';

const STATUS_LABELS: Record<FulfillmentQueueItem['status'], string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  partially_dispensed: 'Partially dispensed',
  fulfilled: 'Fulfilled',
  dispensed_elsewhere: 'Dispensed elsewhere',
  rejected: 'Rejected',
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function attributionVerb(action: NonNullable<FulfillmentQueueItem['attribution']>['action']) {
  switch (action) {
    case 'dispensed':
      return 'Dispensed by';
    case 'sample_collected':
      return 'Sample collected by';
    case 'rejected':
      return 'Rejected by';
    case 'verified':
    default:
      return 'Updated by';
  }
}

interface LabResultUploaderProps {
  itemId: string;
  result?: FulfillmentLabResult | null;
  isUploading: boolean;
  onUpload: (itemId: string, file: File) => Promise<unknown>;
}

function LabResultUploader({ itemId, result, isUploading, onUpload }: LabResultUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectFile = (selected: File | null) => {
    setError(null);
    if (!selected) {
      setFile(null);
      return;
    }
    if (!ALLOWED_TYPES.includes(selected.type)) {
      setError('Upload a PDF, JPEG, or PNG file.');
      setFile(null);
      return;
    }
    if (selected.size > MAX_FILE_BYTES) {
      setError('The file must be 10 MB or smaller.');
      setFile(null);
      return;
    }
    setFile(selected);
  };

  const upload = async () => {
    if (!file) return;
    try {
      await onUpload(itemId, file);
      setFile(null);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Could not upload the file.');
    }
  };

  return (
    <div className={styles.uploader}>
      {result ? (
        <div className={styles.resultAttachment}>
          <span className={styles.resultBadge}>Attached</span>
          <div>
            <p className={styles.resultName}>{result.fileName}</p>
            <p className={styles.resultMeta}>
              {formatBytes(result.sizeBytes)} · uploaded {formatDateTime(result.uploadedAt)}
            </p>
            {result.downloadUrl ? (
              <a href={result.downloadUrl} target="_blank" rel="noreferrer">
                Download lab result
              </a>
            ) : (
              <p className={styles.resultMeta}>Stored securely on the server.</p>
            )}
          </div>
        </div>
      ) : null}

      <label className={styles.fileLabel}>
        <span>{result ? 'Replace lab result file' : 'Attach lab result file'}</span>
        <input
          type="file"
          accept=".pdf,image/jpeg,image/png"
          onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
        />
      </label>
      <p className={styles.hint}>PDF, JPEG, or PNG · up to 10 MB.</p>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <Button
        variant="secondary"
        onClick={upload}
        disabled={!file || isUploading}
        loading={isUploading}
      >
        {result ? 'Upload replacement' : 'Upload lab result'}
      </Button>
    </div>
  );
}

export function FacilityQueuePanel({ facilityId }: { facilityId: string }) {
  const queueQuery = useFacilityQueue(facilityId);
  const statusMutation = useUpdateFulfillmentStatus(facilityId);
  const uploadMutation = useUploadLabResult(facilityId);
  const [filter, setFilter] = useState<QueueFilter>('all');

  const items = queueQuery.data ?? [];

  const counts = useMemo(
    () => ({
      all: items.length,
      active: items.filter((item) => item.status === 'pending' || item.status === 'in_progress').length,
      done: items.filter((item) => item.status === 'fulfilled' || item.status === 'rejected').length,
    }),
    [items],
  );

  const visibleItems = useMemo(() => {
    if (filter === 'active') {
      return items.filter((item) => item.status === 'pending' || item.status === 'in_progress');
    }
    if (filter === 'done') {
      return items.filter((item) => item.status === 'fulfilled' || item.status === 'rejected');
    }
    return items;
  }, [filter, items]);

  const updateStatus = async (itemId: string, status: FulfillmentStatusUpdate) => {
    try {
      await statusMutation.mutateAsync({ itemId, status });
    } catch {
      return;
    }
  };

  if (queueQuery.isLoading) {
    return (
      <section className={styles.card} aria-labelledby="facility-queue-heading">
        <h2 id="facility-queue-heading">Fulfillment queue</h2>
        <Skeleton lines={4} height="2.25rem" label="Loading fulfillment queue" />
      </section>
    );
  }

  if (queueQuery.isError) {
    return (
      <section className={styles.card} aria-labelledby="facility-queue-heading">
        <h2 id="facility-queue-heading">Fulfillment queue</h2>
        <InlineError
          title="The fulfillment queue couldn't be loaded"
          message={queryErrorMessage(queueQuery.error)}
          onRetry={() => void queueQuery.refetch()}
        />
      </section>
    );
  }

  return (
    <section className={styles.card} aria-labelledby="facility-queue-heading">
      <div className={styles.header}>
        <div>
          <h2 id="facility-queue-heading">Fulfillment queue</h2>
          <p className={styles.subtitle}>
            Prescriptions and diagnostic orders assigned to this facility. Every status
            change records the acting staff member.
          </p>
        </div>
        <label className={styles.filterLabel}>
          Show
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as QueueFilter)}
          >
            <option value="all">All ({counts.all})</option>
            <option value="active">Needs action ({counts.active})</option>
            <option value="done">Done ({counts.done})</option>
          </select>
        </label>
      </div>

      {statusMutation.isError ? (
        <p className={styles.error} role="alert">
          Could not update the item: {statusMutation.error.message}
        </p>
      ) : null}
      {uploadMutation.isError ? (
        <p className={styles.error} role="alert">
          Could not upload the lab result: {uploadMutation.error.message}
        </p>
      ) : null}

      {visibleItems.length === 0 ? (
        <EmptyState
          title={items.length === 0 ? 'No items in the fulfillment queue.' : 'No items match this filter.'}
          description={
            items.length === 0
              ? 'Assigned prescriptions and lab orders appear here for dispensing or collection.'
              : 'Switch the filter back to "All" to see the rest of the queue.'
          }
          action={
            items.length === 0
              ? { label: 'Refresh the queue', onClick: () => void queueQuery.refetch() }
              : { label: 'Show all items', onClick: () => setFilter('all') }
          }
        />
      ) : (
        <ul className={styles.queueList}>
          {visibleItems.map((item) => {
            const isItemUpdating =
              statusMutation.isPending && statusMutation.variables?.itemId === item.id;
            const isTerminal = item.status === 'fulfilled' || item.status === 'rejected';
            const canStart = item.status === 'pending';
            const canAct = !isTerminal;

            return (
              <li key={item.id} className={styles.queueItem}>
                <div className={styles.itemHeader}>
                  <div>
                    <p className={styles.itemName}>{item.itemName}</p>
                    <p className={styles.itemMeta}>
                      <span>Patient: {item.patientName}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.orderType === 'prescription' ? 'Prescription' : 'Diagnostic test'}</span>
                      <span aria-hidden="true">·</span>
                      <span>Received {formatDateTime(item.receivedAt)}</span>
                    </p>
                  </div>
                  <span
                    className={`${styles.statusPill} ${styles[`status_${item.status}`]}`}
                  >
                    {STATUS_LABELS[item.status]}
                  </span>
                </div>

                {item.instructions ? (
                  <p className={styles.instructions}>Instructions: {item.instructions}</p>
                ) : null}

                {item.attribution ? (
                  <div className={styles.attribution} aria-label="Action attribution">
                    <span>
                      {attributionVerb(item.attribution.action)}{' '}
                      <strong>{item.attribution.performedByName}</strong> (
                      {item.attribution.performedByRole}) on{' '}
                      {formatDateTime(item.attribution.timestamp)}
                      {item.attribution.notes ? ` — “${item.attribution.notes}”` : ''}
                    </span>
                  </div>
                ) : null}

                {canAct ? (
                  <div className={styles.actions}>
                    {canStart ? (
                      <Button
                        variant="secondary"
                        onClick={() => updateStatus(item.id, 'in_progress')}
                        loading={isItemUpdating && statusMutation.variables?.status === 'in_progress'}
                        disabled={statusMutation.isPending}
                      >
                        Start processing
                      </Button>
                    ) : null}
                    <Button
                      variant="danger"
                      onClick={() => updateStatus(item.id, 'rejected')}
                      loading={isItemUpdating && statusMutation.variables?.status === 'rejected'}
                      disabled={statusMutation.isPending}
                    >
                      Reject
                    </Button>
                    <Button
                      onClick={() => updateStatus(item.id, 'fulfilled')}
                      loading={isItemUpdating && statusMutation.variables?.status === 'fulfilled'}
                      disabled={statusMutation.isPending}
                    >
                      {item.orderType === 'prescription' ? 'Dispense & fulfill' : 'Collect & fulfill'}
                    </Button>
                  </div>
                ) : null}

                {item.orderType === 'lab' && item.status !== 'rejected' ? (
                  <LabResultUploader
                    itemId={item.id}
                    result={item.labResult}
                    isUploading={
                      uploadMutation.isPending && uploadMutation.variables?.itemId === item.id
                    }
                    onUpload={(itemId, file) => uploadMutation.mutateAsync({ itemId, file })}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
