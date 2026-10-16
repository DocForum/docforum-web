import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuthStore } from '../../../store/auth-store';
import { downloadDataExport, getDataExportStatus, requestDataExport } from '../../../services/account-service';

export function useDataExport() {
  const accessToken = useAuthStore((s) => s.accessToken);

  return useQuery({
    queryKey: ['account', 'data-export'],
    queryFn: () => getDataExportStatus(accessToken!),
    enabled: Boolean(accessToken),
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
    mutationFn: (password: string) => requestDataExport(password, accessToken!),
    onSuccess: (data) => {
      queryClient.setQueryData(['account', 'data-export'], data);
      queryClient.invalidateQueries({ queryKey: ['account', 'data-export'] });
    },
  });
}

export function useDownloadExport() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const download = async (exportId: string, filename = 'docforum-data-export.json') => {
    if (!accessToken) return;
    setIsDownloading(true);
    setDownloadError(null);

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
      setDownloadError(err instanceof Error ? err.message : 'Failed to download export');
    } finally {
      setIsDownloading(false);
    }
  };

  return { download, isDownloading, downloadError };
}
