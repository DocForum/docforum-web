// Where an audited entity can be opened in this app, by docforum-core
// entity type. Only types with a view an admin can actually reach are
// listed — appointments and doctor profiles have no admin-facing screen yet
// (the consultation view is doctor-only), so they render as plain ids.
const RECORD_VIEWS: Record<string, (entityId: string) => string> = {
  PaymentIntent: (entityId) => `/admin?intent=${encodeURIComponent(entityId)}`,
};

export function entityRecordPath(entityType: string, entityId: string): string | null {
  // hasOwn, not `in`: an entity type of "constructor" must not resolve to
  // Object.prototype.constructor.
  if (!Object.hasOwn(RECORD_VIEWS, entityType)) return null;
  return RECORD_VIEWS[entityType](entityId);
}
