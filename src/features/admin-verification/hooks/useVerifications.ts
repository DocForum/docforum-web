import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as verificationService from '../../../services/admin-verification-service';
import * as auditService from '../../../services/audit-service';
import { ApiError } from '../../../services/api-client';
import { invalidateFor } from '../../../invalidations';
import { auditKeys, verificationKeys } from '../../../query-keys';
import { useAuthStore } from '../../../store/auth-store';
import { toDecision } from '../queue';
import type { VerificationDecision, VerificationDetail } from '../../../types/models';

function shouldRetry(failureCount: number, error: Error): boolean {
  // A 4xx won't fix itself on retry — only retry network/5xx failures.
  if (error instanceof ApiError && error.status < 500) return false;
  return failureCount < 1;
}

/** The pending queue, oldest first across every loaded page. */
export function useVerificationQueue() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useInfiniteQuery({
    queryKey: verificationKeys.list(),
    queryFn: ({ pageParam, signal }) =>
      verificationService.listVerifications({ cursor: pageParam }, accessToken!, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(accessToken),
    retry: shouldRetry,
  });
}

export function useVerification(doctorProfileId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: verificationKeys.detail(doctorProfileId ?? 'none'),
    queryFn: ({ signal }) => verificationService.getVerification(doctorProfileId!, accessToken!, signal),
    enabled: Boolean(accessToken && doctorProfileId),
    retry: shouldRetry,
  });
}

/**
 * Decision history per doctor — projected from docforum-core's REAL audit
 * trail (`doctor.verification_status_changed` events), so it reflects decisions
 * made through any channel, not just this dialog. A failure here degrades to a
 * notice; the rest of the detail page still works.
 */
export function useVerificationHistory(doctorProfileId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: auditKeys.page('verification-history', { entityId: doctorProfileId }),
    queryFn: ({ signal }) =>
      auditService.listAuditEvents(
        { entityType: 'DoctorProfile', entityId: doctorProfileId, limit: 50 },
        accessToken!,
        signal,
      ),
    enabled: Boolean(accessToken && doctorProfileId),
    retry: shouldRetry,
    select: (page): VerificationDecision[] =>
      page.items
        .map(toDecision)
        .filter((decision): decision is VerificationDecision => decision !== null),
  });
}

/**
 * Approve or reject. Success refreshes the doctor's detail, the pending queue
 * and the audit-backed history together (`admin.verification.decision`), so a
 * decided doctor drops out of the list the admin returns to. A conflict or a
 * 404 also refreshes: someone else decided first and this screen is stale.
 */
export function useDecideVerification(doctorProfileId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Parameters<typeof verificationService.decideVerification>[1]) =>
      verificationService.decideVerification(doctorProfileId, input, accessToken!),
    onSuccess: (profile) => {
      // Flip the cached badge immediately; the same invalidation then refetches
      // detail, queue and history so everything the admin sees agrees.
      queryClient.setQueryData<VerificationDetail>(
        verificationKeys.detail(doctorProfileId),
        (detail) => (detail ? applyDecisionToDetail(detail, profile.verificationStatus) : detail),
      );
      return invalidateFor(queryClient, 'admin.verification.decision', doctorProfileId);
    },
    onError: (error) => {
      if (error instanceof ApiError && (error.status === 409 || error.status === 404)) {
        return invalidateFor(queryClient, 'admin.verification.decision', doctorProfileId);
      }
    },
  });
}

/** Mint a short-lived document URL — one per click, held in component state. */
export function useCredentialDocumentUrl(doctorProfileId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useMutation({
    mutationFn: (documentId: string) =>
      verificationService.requestDocumentUrl(doctorProfileId, documentId, accessToken!),
  });
}

/** Keep the cached detail in step with the profile the PATCH returned, so the
 * status badge flips without a round trip; the rest of the detail (documents,
 * submittedAt) is unchanged by a decision. */
export function applyDecisionToDetail(
  detail: VerificationDetail,
  status: VerificationDetail['profile']['verificationStatus'],
): VerificationDetail {
  return { ...detail, profile: { ...detail.profile, verificationStatus: status } };
}
