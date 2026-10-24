import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as verificationService from '../../../services/doctor-verification-service';
import { invalidateApplication } from './useVerification';
import { useAuthStore } from '../../../store/auth-store';
import { uploadPercent } from '../requirements';
import type { CredentialType, DoctorCredential } from '../../../types/models';

export interface CredentialUploadInput {
  file: File;
  type: CredentialType;
}

export interface CredentialResubmitInput {
  credentialId: string;
  file: File;
}

export interface UploadProgress {
  loadedBytes: number;
  totalBytes: number;
  /** 0-100, clamped. Derived only from real byte counts reported by
   * `apiUpload` — there is no timer faking movement here. */
  percent: number;
}

const IDLE_PROGRESS: UploadProgress = { loadedBytes: 0, totalBytes: 0, percent: 0 };

/** Abort controller + byte counters for one in-flight upload. Shared by
 * upload and resubmit so both get the same progress and cancel contract. */
function useUploadSlot() {
  const controllerRef = useRef<AbortController | null>(null);
  // True while the in-flight request is one *we* aborted: `apiUpload` rejects
  // on abort, and a cancel the doctor asked for is not a failure to show.
  const cancelledRef = useRef(false);
  const [progress, setProgress] = useState<UploadProgress>(IDLE_PROGRESS);

  // Leaving the page mid-upload aborts the request rather than letting it
  // land on an unmounted component.
  useEffect(
    () => () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
    },
    [],
  );

  const begin = useCallback((totalBytes: number) => {
    cancelledRef.current = false;
    const controller = new AbortController();
    controllerRef.current = controller;
    setProgress({ loadedBytes: 0, totalBytes, percent: 0 });
    return controller.signal;
  }, []);

  const track = useCallback((loadedBytes: number, totalBytes: number) => {
    setProgress({ loadedBytes, totalBytes, percent: uploadPercent(loadedBytes, totalBytes) });
  }, []);

  const finish = useCallback(() => {
    controllerRef.current = null;
    setProgress(IDLE_PROGRESS);
  }, []);

  const abort = useCallback(() => {
    cancelledRef.current = true;
    controllerRef.current?.abort();
    controllerRef.current = null;
    setProgress(IDLE_PROGRESS);
  }, []);

  return { progress, begin, track, finish, abort, isCancelled: () => cancelledRef.current };
}

export function useCredentialUpload() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const { progress, begin, track, finish, abort, isCancelled } = useUploadSlot();

  const mutation = useMutation<DoctorCredential, Error, CredentialUploadInput>({
    mutationFn: ({ file, type }) =>
      verificationService.uploadCredential(file, type, accessToken!, {
        signal: begin(file.size),
        onProgress: track,
      }),
    onSuccess: () => invalidateApplication(queryClient),
  });

  const upload = useCallback(
    (input: CredentialUploadInput, onDone?: (credential: DoctorCredential) => void) => {
      mutation.mutate(input, {
        onSuccess: (credential) => {
          finish();
          onDone?.(credential);
        },
        onError: finish,
      });
    },
    [mutation, finish],
  );

  return {
    upload,
    isPending: mutation.isPending,
    // A cancel we asked for never reaches the error slot.
    error: isCancelled() ? null : mutation.error,
    progress,
    abort: () => {
      abort();
      mutation.reset();
    },
  };
}

export function useCredentialResubmit() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const { progress, begin, track, abort, isCancelled } = useUploadSlot();

  const mutation = useMutation<DoctorCredential, Error, CredentialResubmitInput>({
    mutationFn: ({ credentialId, file }) =>
      verificationService.resubmitCredential(credentialId, file, accessToken!, {
        signal: begin(file.size),
        onProgress: track,
      }),
    onSuccess: () => invalidateApplication(queryClient),
  });

  return {
    resubmit: mutation.mutate,
    // One shared mutation, so only the row that started it shows a spinner.
    pendingCredentialId: mutation.isPending ? mutation.variables?.credentialId ?? null : null,
    isPending: mutation.isPending,
    error: isCancelled() ? null : mutation.error,
    progress,
    abort: () => {
      abort();
      mutation.reset();
    },
  };
}

export function useDeleteCredential() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation<void, Error, { credentialId: string }>({
    mutationFn: ({ credentialId }) => verificationService.deleteCredential(credentialId, accessToken!),
    onSuccess: () => invalidateApplication(queryClient),
  });
}
