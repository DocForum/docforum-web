import { ApiError } from '../../services/api-client';

export interface ResolveFailure {
  /**
   * `conflict` — another admin already resolved it (or the dispute is no
   * longer open): close the dialog and refresh.
   * `rejected` — docforum-core refused this request; the admin can change it.
   * `unconfirmed` — no answer. Retrying is safe: a duplicate comes back as a
   * conflict thanks to `expectedUpdatedAt`.
   */
  kind: 'conflict' | 'rejected' | 'auth' | 'unconfirmed';
  message: string;
}

export function describeQueueError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return 'Your session no longer has admin access. Sign in again with an admin account.';
    }
    if (error.status === 404) {
      return "docforum-core doesn't serve the disputes queue yet — this screen is built against an assumed API.";
    }
  }
  return "Couldn't load open disputes. The preview backend may be waking up — try again in a minute.";
}

export function describeDetailError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return 'Your session no longer has admin access. Sign in again with an admin account.';
    }
    if (error.status === 404) {
      return 'This dispute no longer exists. Another admin may have resolved it — return to the queue to see the current list.';
    }
  }
  return "Couldn't load this dispute. The preview backend may be waking up — try again in a minute.";
}

export function describeAttachmentError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return 'That attachment is no longer available. Refresh the dispute to see the current evidence.';
    }
    if (error.status === 401 || error.status === 403) {
      return 'Your session no longer has admin access. Sign in again to open evidence.';
    }
  }
  return "Couldn't get a fresh attachment link. Try again — links are minted per open and expire.";
}

export function describeResolveError(error: unknown): ResolveFailure {
  if (error instanceof ApiError) {
    if (error.status === 409 || error.status === 404) {
      return {
        kind: 'conflict',
        message:
          'This dispute changed while you were working on it — another admin may have resolved it first. ' +
          'Nothing was changed by you; the dispute has been refreshed.',
      };
    }
    if (error.status === 400 || error.status === 422) {
      return { kind: 'rejected', message: `docforum-core refused the resolution: ${error.message}` };
    }
    if (error.status === 401 || error.status === 403) {
      return {
        kind: 'auth',
        message: 'Your session no longer has admin access. Sign in again with an admin account.',
      };
    }
  }
  return {
    kind: 'unconfirmed',
    message:
      "Couldn't confirm the resolution — the preview backend may be waking up. Try again; if the first " +
      "attempt went through you'll be told, it won't be applied twice.",
  };
}
