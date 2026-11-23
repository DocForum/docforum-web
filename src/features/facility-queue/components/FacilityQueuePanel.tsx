import { useMemo, useState } from 'react';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/states/EmptyState';
import { InlineError } from '../../../components/states/InlineError';
import { queryErrorMessage } from '../../../components/states/QueryState';
import { Skeleton } from '../../../components/states/Skeleton';
import { ApiError } from '../../../services/api-client';
import type {
  FulfillmentLabResult,
  FulfillmentQueueItem,
  FulfillmentStatusUpdate,
  PharmacyFulfillmentRecordStatus,
} from '../../../types/models';
import {
  useDispenseFulfillmentItem,
  useFacilityQueue,
  useUpdateFulfillmentRecord,
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

const RECORD_STATUS_LABELS: Record<PharmacyFulfillmentRecordStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  partially_fulfilled: 'Partially fulfilled',
  fulfilled: 'Fulfilled',
  rejected: 'Rejected',
};

const ORDER_STATUS_LABELS = {
  issued: 'Issued',
  partially_fulfilled: 'Partially fulfilled',
  fulfilled: 'Fulfilled',
} as const;

/** opdocforum-core's record derives fulfilled from its items — this is the
 * read-only label for that derived state, never something we set. */
function derivedRecordStatus(
  item: FulfillmentQueueItem,
): PharmacyFulfillmentRecordStatus | 'unfulfilled' {
  switch (item.status) {
    case 'fulfilled':
      return 'fulfilled';
    case 'partially_dispensed':
      return 'partially_fulfilled';
    case 'rejected':
      return 'rejected';
    case 'in_progress':
      return 'in_progress';
    case 'dispensed_elsewhere':
      return 'unfulfilled';
    default:
      return 'pending';
  }
}

function recordIdOf(item: FulfillmentQueueItem): string {
  return item.fulfillmentRecordId ?? item.id;
}

function recordItemIdOf(item: FulfillmentQueueItem): string {
  return item.fulfillmentItemId ?? item.id;
}

function outstandingOf(item: FulfillmentQueueItem): number {
  if (typeof item.quantityOutstanding === 'number') return item.quantityOutstanding;
  return Math.max(0, (item.quantityPrescribed ?? 1) - (item.quantityDispensed ?? 0));
}

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

function mutationErrorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return 'docforum-core refused this change: the item was already updated or dispensed, possibly at another facility. The queue has been refreshed — check the latest status before trying again.';
    }
    if (error.status === 403) {
      return 'docforum-core refused this change. Your account needs a verified facility email.';
    }
    if (error.status === 400) {
      return 'docforum-core rejected the request. Check the quantity and status, then refresh the queue.';
    }
    return `docforum-core refused the change (${error.status}).`;
  }
  return "Couldn't reach docforum-core, so the change may or may not have been saved. Refresh the queue before trying again.";
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
  const recordMutation = useUpdateFulfillmentRecord(facilityId);
  const itemMutation = useDispenseFulfillmentItem(facilityId);
  const uploadMutation = useUploadLabResult(facilityId);
  const [filter, setFilter] = useState<QueueFilter>('all');

  const items = queueQuery.data ?? [];

  const counts = useMemo(
    () => ({
      all: items.length,
      active: items.filter((item) =>
        ['pending', 'in_progress', 'partially_dispensed'].includes(item.status),
      ).length,
      done: items.filter((item) => ['fulfilled', 'rejected', 'dispensed_elsewhere'].includes(item.status))
        .length,
    }),
    [items],
  );

  const visibleItems = useMemo(() => {
    if (filter === 'active') {
      return items.filter((item) =>
        ['pending', 'in_progress', 'partially_dispensed'].includes(item.status),
      );
    }
    if (filter === 'done') {
      return items.filter((item) =>
        ['fulfilled', 'rejected', 'dispensed_elsewhere'].includes(item.status),
      );
    }
    return items;
  }, [filter, items]);

  const updateRecord = async (item: FulfillmentQueueItem, status: FulfillmentStatusUpdate) => {
    try {
      await recordMutation.mutateAsync({ recordId: recordIdOf(item), status });
    } catch {
      // The error is rendered from `recordMutation.error`; the hooks refresh
      // the queue in `onError` so a 409 shows the state that actually won.
    }
  };

  const dispense = async (item: FulfillmentQueueItem) => {
    const quantity = outstandingOf(item);
    if (quantity < 1) return;
    try {
      await itemMutation.mutateAsync({
        recordId: recordIdOf(item),
        itemId: recordItemIdOf(item),
        quantity,
      });
    } catch {
      // Rendered from `itemMutation.error`; never auto-retried.
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

  const isBusy = recordMutation.isPending || itemMutation.isPending;

  return (
    <section className={styles.card} aria-labelledby="facility-queue-heading">
      <div className={styles.header}>
        <div>
          <h2 id="facility-queue-heading">Fulfillment queue</h2>
          <p className={styles.subtitle}>
            Prescriptions and diagnostic orders assigned to this facility. Statuses are derived by
            docforum-core from the items on each fulfillment record; every change records the acting
            staff member.
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

      {recordMutation.isError ? (
        <p className={styles.error} role="alert">
          {mutationErrorText(recordMutation.error)}
        </p>
      ) : null}
      {itemMutation.isError ? (
        <p className={styles.error} role="alert">
          {mutationErrorText(itemMutation.error)}
        </p>
      ) : null}
      {uploadMutation.isError ? (
        <p className={styles.error} role="alert">
          Could not upload the lab result: {uploadMutation.error.message}
        </p>
      ) : null}
      {recordMutation.isSuccess && recordMutation.data ? (
        <p className={styles.muted} role="status">
          Record updated. Status is now{' '}
          <strong>{RECORD_STATUS_LABELS[recordMutation.data.status]}</strong>.
        </p>
      ) : null}
      {itemMutation.isSuccess && itemMutation.data ? (
        <p className={styles.muted} role="status">
          Item dispensed. The record is now{' '}
          <strong>{RECORD_STATUS_LABELS[itemMutation.data.record.status]}</strong> and the order is{' '}
          <strong>{ORDER_STATUS_LABELS[itemMutation.data.orderStatus]}</strong>.
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
            const recordStatus = derivedRecordStatus(item);
            const outstanding = outstandingOf(item);
            const isItemUpdating =
              recordMutation.isPending &&
              recordMutation.variables?.recordId === recordIdOf(item);
            const isDispensing =
              itemMutation.isPending && itemMutation.variables?.itemId === recordItemIdOf(item);
            const isTerminal =
              item.status === 'fulfilled' ||
              item.status === 'rejected' ||
              item.status === 'dispensed_elsewhere';
            const canStart = item.status === 'pending';
            const canReject = item.status === 'pending' || item.status === 'in_progress';
            // A record item is one-shot. A partially dispensed row already
            // exercised its PATCH; the remainder must be rerouted, not
            // dispensed again here.
            const canDispense =
              item.status === 'pending' && (item.canDispense ?? true) && outstanding > 0;
            const canAct = canStart || canReject || canDispense;

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
                  <div>
                    <span
                      className={`${styles.statusPill} ${styles[`status_${item.status}`]}`}
                    >
                      {STATUS_LABELS[item.status]}
                    </span>
                    <p className={styles.recordStatus}>
                      Record status:{' '}
                      {recordStatus === 'unfulfilled'
                        ? 'Unfulfilled'
                        : RECORD_STATUS_LABELS[recordStatus]}{' '}
                      (derived)
                    </p>
                  </div>
                </div>

                {item.instructions ? (
                  <p className={styles.instructions}>Instructions: {item.instructions}</p>
                ) : null}

                {typeof item.quantityPrescribed === 'number' ? (
                  <p className={styles.muted}>
                    {item.quantityDispensed ?? 0} of {item.quantityPrescribed} {item.unit ?? 'units'}{' '}
                    dispensed · {outstanding} outstanding
                    {item.status === 'partially_dispensed' && outstanding > 0
                      ? ' — reroute the remainder from the order.'
                      : ''}
                  </p>
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

                {canAct && !isTerminal ? (
                  <div className={styles.actions}>
                    {canStart ? (
                      <Button
                        variant="secondary"
                        onClick={() => void updateRecord(item, 'in_progress')}
                        loading={isItemUpdating && recordMutation.variables?.status === 'in_progress'}
                        disabled={isBusy}
                      >
                        Start processing
                      </Button>
                    ) : null}
                    {canReject ? (
                      <Button
                        variant="danger"
                        onClick={() => void updateRecord(item, 'rejected')}
                        loading={isItemUpdating && recordMutation.variables?.status === 'rejected'}
                        disabled={isBusy}
                      >
                        Reject
                      </Button>
                    ) : null}
                    {canDispense ? (
                      <Button
                        onClick={() => void dispense(item)}
                        loading={isDispensing}
                        disabled={isBusy}
                      >
                        {item.orderType === 'prescription' ? 'Dispense' : 'Collect sample'}
                      </Button>
                    ) : null}
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
