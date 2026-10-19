import { useMemo } from 'react';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { Spinner } from '../../../components/Spinner';
import { useDoctorSearch } from '../hooks/useDoctorSearch';
import { useSymptomMapping } from '../hooks/useSymptomMapping';
import { useSearchUrlState } from '../hooks/useSearchUrlState';
import { formatSpecialtyList } from '../specialty-list';
import { AvailabilityFilter } from './AvailabilityFilter';
import { DoctorResultCard } from './DoctorResultCard';
import { SymptomCombobox } from './SymptomCombobox';
import type { AvailabilityFilter as AvailabilityFilterValue } from '../../../types/models';
import styles from './DoctorSearch.module.css';

const AVAILABILITY_RESULT_PHRASE: Record<AvailabilityFilterValue, string> = {
  any: '',
  week: ' with slots in the next 7 days',
  today: ' available today',
};

const AVAILABILITY_WINDOW_PHRASE: Record<AvailabilityFilterValue, string> = {
  any: 'at any time',
  week: 'in the next 7 days',
  today: 'today',
};

/**
 * Symptom-based doctor search (issue #30, on top of #1's doctor search).
 * A symptom is picked from the backend's controlled vocabulary, mapped to
 * the specialties that treat it, and combined with the availability filter
 * — all state in the URL. The no-match state always offers a way forward.
 */
export function DoctorSearchView() {
  const { filters, issues, selectSymptom, setAvailability } = useSearchUrlState();

  const mappingQuery = useSymptomMapping(filters.symptomSlug || null);
  const mapping = mappingQuery.data;
  const specialtyIds = useMemo(
    () => (mapping?.specialties ?? []).map((specialty) => specialty.id),
    [mapping],
  );

  const doctorsQuery = useDoctorSearch(specialtyIds, filters.availability);
  const doctors = doctorsQuery.data;

  const specialtyListText = formatSpecialtyList(
    (mapping?.specialties ?? []).map((specialty) => specialty.name),
  );

  const renderResults = () => {
    if (!filters.symptomSlug) {
      return (
        <div className={styles.emptyState}>
          <h2 className={styles.emptyHeading}>Start with a symptom</h2>
          <p className={styles.emptyBody}>
            Type what’s bothering you above — “headache”, “stomach pain”, “sore throat”. We’ll match
            it to the specialties that treat it and show doctors from those specialties.
          </p>
          <p className={styles.emptyBody}>
            You don’t need to know the medicine: the matching is done from a reviewed list of
            symptoms, and the availability filter narrows the results whenever you like.
          </p>
        </div>
      );
    }

    if (mappingQuery.isError) {
      return (
        <div className={styles.emptyState}>
          <h2 className={styles.emptyHeading}>We can’t look that symptom up</h2>
          <p className={styles.emptyBody}>
            It may have been removed from our list of symptoms, or the link you followed is out of
            date. Clear the symptom and pick a fresh one from the list.
          </p>
          <Button variant="secondary" onClick={() => selectSymptom(null)}>
            Clear symptom
          </Button>
        </div>
      );
    }

    if (mappingQuery.isFetching || (mapping && doctorsQuery.isFetching)) {
      return (
        <div className={styles.loading} role="status">
          <Spinner size={16} />
          <span>Searching doctors for you…</span>
        </div>
      );
    }

    if (doctorsQuery.isError) {
      return (
        <div>
          <FormError
            message={
              doctorsQuery.error instanceof Error
                ? doctorsQuery.error.message
                : 'Something went wrong while searching doctors.'
            }
          />
          <Button variant="secondary" onClick={() => doctorsQuery.refetch()}>
            Try again
          </Button>
        </div>
      );
    }

    if (!doctors) return null;

    if (doctors.length === 0) {
      return (
        <div className={styles.emptyState}>
          <h2 className={styles.emptyHeading}>No doctors match right now</h2>
          <p className={styles.emptyBody}>
            {specialtyListText
              ? `None of the doctors in ${specialtyListText} have open slots ${AVAILABILITY_WINDOW_PHRASE[filters.availability]}.`
              : 'No doctors match this search right now.'}
          </p>
          <ul className={styles.guidanceList}>
            {filters.availability === 'today' && (
              <li>Doctors in these specialties may have slots later this week.</li>
            )}
            {filters.availability !== 'any' && (
              <li>Try “Any time” to see every doctor in these specialties.</li>
            )}
            <li>Try a different symptom — other symptoms map to different specialties.</li>
          </ul>
          {filters.availability !== 'any' && (
            <Button variant="secondary" onClick={() => setAvailability('any')}>
              Show doctors with any availability
            </Button>
          )}
        </div>
      );
    }

    return (
      <>
        <p role="status" className={styles.resultCount}>
          {doctors.length} doctor{doctors.length === 1 ? '' : 's'} found
          {AVAILABILITY_RESULT_PHRASE[filters.availability]}.
        </p>
        <ul className={styles.doctorList}>
          {doctors.map((doctor) => (
            <DoctorResultCard key={doctor.id} doctor={doctor} />
          ))}
        </ul>
      </>
    );
  };

  return (
    <div className={styles.container}>
      <header className={styles.intro}>
        <h1 className={styles.heading}>Find the right doctor for what’s bothering you</h1>
        <p className={styles.subheading}>
          Describe a symptom — like “rash” or “chest pain” — and we’ll show doctors from the
          specialties that treat it. No medical training required.
        </p>
      </header>

      {issues.length > 0 && (
        <div role="status" className={styles.notices}>
          {issues.map((issue) => (
            <p key={issue} className={styles.notice}>
              {issue}
            </p>
          ))}
        </div>
      )}

      <section className={styles.searchCard} aria-label="Symptom search">
        <SymptomCombobox
          selectedSlug={filters.symptomSlug}
          selectedTerm={mapping?.term}
          onSelect={selectSymptom}
        />

        {filters.symptomSlug && (
          <div className={styles.appliedRow}>
            {mappingQuery.isFetching && (
              <p className={styles.appliedText}>
                Matching your symptom to the specialties that treat it…
              </p>
            )}
            {!mappingQuery.isFetching && mappingQuery.isError && (
              <p className={styles.appliedText} role="alert">
                We don’t recognise “{filters.symptomSlug}” any more.
              </p>
            )}
            {!mappingQuery.isFetching && mapping && (
              <p className={styles.appliedText} role="status">
                Showing doctors in <strong>{specialtyListText}</strong>.
              </p>
            )}
            <Button variant="secondary" onClick={() => selectSymptom(null)}>
              Clear symptom
            </Button>
          </div>
        )}

        <AvailabilityFilter value={filters.availability} onChange={setAvailability} />
      </section>

      <section aria-label="Doctors" className={styles.results} aria-busy={doctorsQuery.isFetching}>
        {renderResults()}
      </section>
    </div>
  );
}
