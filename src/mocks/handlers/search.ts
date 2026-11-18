// Doctor search + symptom vocabulary/mapping endpoints (issues #1/#30).
// The vocabulary is the mock's controlled list — free text is never
// fuzzy-matched into doctors, only picked symptoms map to specialties,
// mirroring docforum-core#60's "controlled vocabulary, no ML" contract.
import { http } from 'msw';
import { db } from '../db';
import { notFound, respond } from '../helpers';
import type { DoctorSearchResult, SymptomSpecialtyMapping, SymptomSuggestion } from '../../types/models';

const WEEK_MS = 7 * 24 * 3_600_000;
// The mock approximates "today" as the next 24 hours — precise local-day
// boundaries are the real backend's concern (ARCHITECTURE_ESSENTIALS.md).
const TODAY_MS = 24 * 3_600_000;

export const searchHandlers = [
  // Controlled-vocabulary autocomplete: `?q=<text>&limit=<n>`, substring
  // match on the term, case-insensitive.
  http.get(
    '*/symptoms',
    respond('list', ({ request }) => {
      const url = new URL(request.url);
      const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
      const limit = Number(url.searchParams.get('limit') ?? '8');

      if (!q) return [];
      const matches: SymptomSuggestion[] = db.symptoms
        .filter((symptom) => symptom.term.toLowerCase().includes(q))
        .map(({ slug, term }) => ({ slug, term }));
      return matches.slice(0, Number.isFinite(limit) && limit > 0 ? limit : 8);
    }),
  ),

  // The specialties a vocabulary symptom maps to. Registered after the
  // collection route so `?q=` above wins for the bare path.
  http.get(
    '*/symptoms/:slug',
    respond('json', ({ params }) => {
      const symptom = db.symptoms.find((entry) => entry.slug === String(params.slug));
      if (!symptom) return notFound('symptom');

      const mapping: SymptomSpecialtyMapping = {
        slug: symptom.slug,
        term: symptom.term,
        specialties: symptom.specialtyIds
          .map((id) => db.specialties.find((specialty) => specialty.id === id))
          .filter((specialty): specialty is NonNullable<typeof specialty> => Boolean(specialty)),
      };
      return mapping;
    }),
  ),

  // Doctors by mapped specialties + availability. `specialtyIds` is a
  // comma-separated list matched with OR (a symptom can map to several
  // specialties); only verified doctors are ever visible to patients.
  http.get(
    '*/doctors',
    respond('list', ({ request }) => {
      const url = new URL(request.url);
      const specialtyIds = (url.searchParams.get('specialtyIds') ?? '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      const availability = url.searchParams.get('availability');

      let doctors: DoctorSearchResult[] = db.doctors
        .filter((doctor) => doctor.verificationStatus === 'verified')
        .map((doctor) => ({ ...doctor, specialties: doctor.specialties.map((s) => ({ ...s })) }));

      if (specialtyIds.length > 0) {
        doctors = doctors.filter((doctor) =>
          doctor.specialties.some((specialty) => specialtyIds.includes(specialty.id)),
        );
      }

      if (availability === 'today' || availability === 'week') {
        const windowMs = availability === 'today' ? TODAY_MS : WEEK_MS;
        const now = Date.now();
        doctors = doctors.filter((doctor) => {
          if (!doctor.nextAvailableAt) return false;
          const availableAt = new Date(doctor.nextAvailableAt).getTime();
          return availableAt >= now && availableAt - now <= windowMs;
        });
      }

      // Soonest-available first; "no slots" listings last.
      doctors.sort((a, b) => {
        if (!a.nextAvailableAt) return 1;
        if (!b.nextAvailableAt) return -1;
        return a.nextAvailableAt.localeCompare(b.nextAvailableAt);
      });
      return doctors;
    }),
  ),
];
