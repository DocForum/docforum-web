import type { Specialty } from './stuck-referrals';

// --- Public doctor directory (Phase W2, issues #1 and #13) ------------------
// These mirror docforum-core's REAL public reads (docs/api/README.md):
//
//   GET /specialties -> Specialty[]
//   GET /doctors?specialty=<slug>&q=&limit=&cursor=
//     -> { items: [{ id, fullName, specialties: [{ id, name, slug }] }],
//          nextCursor }
//
// Only verified doctor profiles and public fields are returned. This is the
// `GET /doctors` endpoint the older symptom-search assumption (issue #30)
// expected; see ARCHITECTURE_ESSENTIALS.md "Known assumptions — Phase W2 —
// doctor directory".

/** One row of the public `GET /doctors` list. */
export interface PublicDoctor {
  id: string;
  fullName: string;
  specialties: Specialty[];
  /**
   * ASSUMED: docforum-core's real `DoctorProfile` has a `timeZone` column,
   * but the public list projection does not include it yet. The profile page
   * therefore renders times in the patient's zone and adds the doctor's zone
   * only when this field is present. See the docs.d fragment for issue #13.
   */
  timeZone?: string;
}

export interface PublicDoctorList {
  items: PublicDoctor[];
  nextCursor: string | null;
}

export interface PublicDoctorQuery {
  /** Specialty slug from `GET /specialties` (core filters by slug, not id). */
  specialty?: string;
  /** Typo-tolerant name search (core uses pg_trgm). */
  q?: string;
  /** 1–50, default 20. */
  limit?: number;
  /** Keyset cursor from a previous page. */
  nextCursor?: string | null;
}
