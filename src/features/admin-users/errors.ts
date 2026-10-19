export const LAST_ADMIN_MESSAGE =
  "You can't deactivate the last remaining admin. Invite or promote another admin first.";

interface ApiErrorLike {
  status?: number;
  code?: string;
  message?: string;
  body?: { code?: string; message?: string };
}

/** The backend refuses to deactivate the last admin (assumed: HTTP 409, code LAST_ADMIN). */
export function isLastAdminError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as ApiErrorLike;
  if (e.code === 'LAST_ADMIN' || e.body?.code === 'LAST_ADMIN') return true;
  return e.status === 409 && /last admin/i.test(e.message ?? e.body?.message ?? '');
}

export function errorMessage(err: unknown): string {
  if (isLastAdminError(err)) return LAST_ADMIN_MESSAGE;
  if (err instanceof Error && err.message) return err.message;
  return 'Something went wrong. Please try again.';
}