import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuthStore } from '../../../store/auth-store';
import { downloadDataExport, getDataExportStatus, requestDataExport } from '../../../services/account-service';
import { invalidateFor } from '../../../invalidations';
import { accountKeys } from '../../../query-keys';
import { ApiError } from '../../../services/api-client';
import type { DataExport } from '../../../types/models';

/**
 * Polls one export by id. docforum-core has no list endpoint, so the id is the
 * only handle: it comes from the 202 that created the export (the `Location`
 * header carries the same id). The caller keeps it in memory for the session
 * — never in storage — and shows the honest empty state after a reload.
 */
export function useDataExport(exportId: string | null) {
  const accessToken = useAuthStore((s) => s.accessToken);

  return useQuery({
    queryKey: accountKeys.dataExport(),
    queryFn: ({ signal }) => getDataExportStatus(exportId!, accessToken!, signal),
    enabled: Boolean(accessToken && exportId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'processing' || status === 'pending' ? 3000 : false;
    },
  });
}

export function useRequestDataExport() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    // `POST /patients/me/export` takes no body: the password re-entry step was
    // removed because it could not be verified and core reads no body.
    mutationFn: () => requestDataExport(accessToken!),
    onSuccess: (data) => {
      queryClient.setQueryData(accountKeys.dataExport(), data);
      void invalidateFor(queryClient, 'account.data-export');
    },
  });
}

export type DownloadProblem = 'not_ready' | 'expired' | 'not_found' | 'other' | null;

export function useDownloadExport() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<unknown>(null);
  const [downloadProblem, setDownloadProblem] = useState<DownloadProblem>(null);

  const resetDownload = () => {
    setDownloadError(null);
    setDownloadProblem(null);
  };

  const download = async (exportId: string, filename = 'docforum-data-export.json') => {
    if (!accessToken) return;
    setIsDownloading(true);
    resetDownload();

    try {
      const blob = await downloadDataExport(exportId, accessToken);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      // Immediately revoke to prevent keeping export in memory
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(err);
      if (err instanceof ApiError && err.status === 409) {
        // EXPORT_NOT_READY — the status moved since the card was rendered.
        setDownloadProblem('not_ready');
        void queryClient.invalidateQueries({ queryKey: accountKeys.dataExport() });
      } else if (err instanceof ApiError && err.status === 410) {
        // EXPORT_EXPIRED — reflect it in the card so the same copy and
        // "request a new export" action apply even before a refetch lands.
        setDownloadProblem('expired');
        queryClient.setQueryData<DataExport>(accountKeys.dataExport(), (current) =>
          current ? { ...current, status: 'expired' } : current,
        );
      } else if (err instanceof ApiError && err.status === 404) {
        setDownloadProblem('not_found');
      } else {
        setDownloadProblem('other');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  return { download, isDownloading, downloadError, downloadProblem, resetDownload };
}
