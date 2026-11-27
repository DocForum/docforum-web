/**
 * Does this `/patient/*` splat render a page that reads `/appointments/mine`?
 * Only the hub's home and its appointment pages do; the `patient/*` loader
 * prefetches the list for those alone, so facilities, orders, settings and
 * the rest never wait on a request they don't use (issue #112).
 */
export function needsMyAppointments(splat: string | undefined): boolean {
  const path = (splat ?? '').replace(/^\/+|\/+$/g, '');
  return path === '' || path.startsWith('appointments/');
}
