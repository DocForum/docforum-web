// Public doctor directory reads for docforum-core's REAL endpoints
// (docs/api/README.md):
//
//   GET /specialties -> { id, name, slug }[] (the seeded catalog)
//   GET /doctors?specialty=<slug>&q=&limit=&cursor=
//     -> { items: PublicDoctor[], nextCursor }
//
// `GET /doctors` is paginated with a keyset cursor and caps `limit` at 50, so
// any "find one doctor / name every doctor" caller here pages explicitly
// rather than guessing a page size. Availability slots come from the separate,
// public `GET /availability/doctors/:id/slots` endpoint (see
// appointments-service.getOpenSlots).
import { apiFetch } from './api-client';
import type { PublicDoctor, PublicDoctorList, PublicDoctorQuery } from '../types/models';
import type { Specialty } from '../types/models';

const PAGE_SIZE = 50;
/** Safety cap so a broken cursor can never spin forever. 20 pages × 50 = 1000
 * doctors, far beyond this preview's catalog. */
const MAX_PAGES = 20;

export function listSpecialties(signal?: AbortSignal): Promise<Specialty[]> {
  return apiFetch<Specialty[]>('/specialties', { signal });
}

export function listPublicDoctors(
  query: PublicDoctorQuery = {},
  signal?: AbortSignal,
): Promise<PublicDoctorList> {
  const params: string[] = [];
  if (query.specialty) params.push(`specialty=${encodeURIComponent(query.specialty)}`);
  if (query.q) params.push(`q=${encodeURIComponent(query.q)}`);
  params.push(`limit=${query.limit ?? 20}`);
  if (query.nextCursor) params.push(`cursor=${encodeURIComponent(query.nextCursor)}`);

  return apiFetch<PublicDoctorList>(`/doctors?${params.join('&')}`, { signal });
}

/** Every page of the public list. Used to resolve a `doctorProfileId` to a
 * name where another real endpoint returns only the id (`/appointments/mine`)
 * and to find one profile for `/doctors/:id` (core has no public single-doctor
 * read). */
export async function listAllPublicDoctors(signal?: AbortSignal): Promise<PublicDoctor[]> {
  const doctors: PublicDoctor[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await listPublicDoctors({ limit: PAGE_SIZE, nextCursor: cursor }, signal);
    doctors.push(...result.items);
    if (!result.nextCursor) break;
    cursor = result.nextCursor;
  }

  return doctors;
}

/** Resolve one doctor id from the paginated public list. `null` means "not in
 * the public directory" (unknown, or no longer verified), not a failed read. */
export async function getPublicDoctor(
  doctorId: string,
  signal?: AbortSignal,
): Promise<PublicDoctor | null> {
  let cursor: string | null = null;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await listPublicDoctors({ limit: PAGE_SIZE, nextCursor: cursor }, signal);
    const match = result.items.find((doctor) => doctor.id === doctorId);
    if (match) return match;
    if (!result.nextCursor) return null;
    cursor = result.nextCursor;
  }

  return null;
}
