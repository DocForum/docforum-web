import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { Spinner } from '../../../components/Spinner';
import { useT } from '../../../i18n/useT';
import { useDoctorSearch } from '../hooks/useDoctorSearch';
import { useSymptomMapping } from '../hooks/useSymptomMapping';
import { useSearchUrlState } from '../hooks/useSearchUrlState';
import { formatSpecialtyList } from '../specialty-list';
import type { SearchNoticeId } from '../search-params';
import { AvailabilityFilter } from './AvailabilityFilter';
import { DoctorResultCard } from './DoctorResultCard';
import { JoinWaitlistDialog } from '../../waitlist/components/JoinWaitlistDialog';
import { SymptomCombobox } from './SymptomCombobox';
import type { AvailabilityFilter as AvailabilityFilterValue } from '../../../types/models';
import styles from './DoctorSearch.module.css';

/** The availability id is an API value; each phrase is a static catalogue
 * call, never a message id built from the raw value. */
function availabilityWindowPhrase(value: AvailabilityFilterValue, t: ReturnType<typeof useT>): string {
  switch (value) {
    case 'any':
      return t('search.noMatch.window.any', 'at any time');
    case 'week':
      return t('search.noMatch.window.week', 'in the next 7 days');
    case 'today':
      return t('search.noMatch.window.today', 'today');
  }
}

function noticeCopy(id: SearchNoticeId, t: ReturnType<typeof useT>): string {
  switch (id) {
    case 'invalidSymptom':
      return t('search.notice.invalidSymptom', 'That symptom link was not valid, so the symptom was cleared.');
    case 'invalidAvailability':
      return t(
        'search.notice.invalidAvailability',
        'That availability filter was not valid, so it was reset to “Any time”.',
      );
  }
}

/**
 * Symptom-based doctor search (issue #30, on top of #1's doctor search).
 * A symptom is picked from the backend's controlled vocabulary, mapped to
 * the specialties that treat it, and combined with the availability filter
 * — all state in the URL. The no-match state always offers a way forward.
 */
export function DoctorSearchView() {
  const t = useT();
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
    t('search.specialty.conjunction', 'and'),
  );

  const renderResults = () => {
    if (!filters.symptomSlug) {
      return (
        <div className={styles.emptyState}>
          <h2 className={styles.emptyHeading}>{t('search.empty.title', 'Start with a symptom')}</h2>
          <p className={styles.emptyBody}>
            {t(
              'search.empty.body1',
              'Type what’s bothering you above — “headache”, “stomach pain”, “sore throat”. We’ll match it to the specialties that treat it and show doctors from those specialties.',
            )}
          </p>
          <p className={styles.emptyBody}>
            {t(
              'search.empty.body2',
              'You don’t need to know the medicine: the matching is done from a reviewed list of symptoms, and the availability filter narrows the results whenever you like.',
            )}
          </p>
        </div>
      );
    }

    if (mappingQuery.isError) {
      return (
        <div className={styles.emptyState}>
          <h2 className={styles.emptyHeading}>{t('search.error.title', 'We can’t look that symptom up')}</h2>
          <p className={styles.emptyBody}>
            {t(
              'search.error.body',
              'It may have been removed from our list of symptoms, or the link you followed is out of date. Clear the symptom and pick a fresh one from the list.',
            )}
          </p>
          <Button variant="secondary" onClick={() => selectSymptom(null)}>
            {t('search.clearSymptom', 'Clear symptom')}
          </Button>
        </div>
      );
    }

    if (mappingQuery.isFetching || (mapping && doctorsQuery.isFetching)) {
      return (
        <div className={styles.loading} role="status">
          <Spinner size={16} />
          <span>{t('search.loading', 'Searching doctors for you…')}</span>
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
                : t('search.error.search', 'Something went wrong while searching doctors.')
            }
          />
          <Button variant="secondary" onClick={() => doctorsQuery.refetch()}>
            {t('common.tryAgain', 'Try again')}
          </Button>
        </div>
      );
    }

    if (!doctors) return null;

    if (doctors.length === 0) {
      return (
        <div className={styles.emptyState}>
          <h2 className={styles.emptyHeading}>{t('search.noMatch.title', 'No doctors match right now')}</h2>
          <p className={styles.emptyBody}>
            {specialtyListText
              ? t('search.noMatch.body', 'None of the doctors in {specialties} have open slots {window}.', {
                  specialties: specialtyListText,
                  window: availabilityWindowPhrase(filters.availability, t),
                })
              : t('search.noMatch.none', 'No doctors match this search right now.')}
          </p>
          <ul className={styles.guidanceList}>
            {filters.availability === 'today' && (
              <li>{t('search.noMatch.laterWeek', 'Doctors in these specialties may have slots later this week.')}</li>
            )}
            {filters.availability !== 'any' && (
              <li>{t('search.noMatch.anyTime', 'Try “Any time” to see every doctor in these specialties.')}</li>
            )}
            <li>{t('search.noMatch.differentSymptom', 'Try a different symptom — other symptoms map to different specialties.')}</li>
          </ul>
          {filters.availability !== 'any' && (
            <Button variant="secondary" onClick={() => setAvailability('any')}>
              {t('search.noMatch.showAny', 'Show doctors with any availability')}
            </Button>
          )}
          <div className={styles.emptyActions}>
            <JoinWaitlistDialog
              specialty={
                mapping?.specialties[0]
                  ? { id: mapping.specialties[0].id, name: mapping.specialties[0].name }
                  : null
              }
              label={
                mapping?.specialties[0]
                  ? `Join the waitlist for ${mapping.specialties[0].name}`
                  : 'Join the waitlist'
              }
            />
          </div>
        </div>
      );
    }

    return (
      <>
        <p role="status" className={styles.resultCount}>
          {t(
            'search.results.count',
            '{count, plural, one {# doctor} other {# doctors}} found{availability, select, any {} week { with slots in the next 7 days} today { available today} other {}}.',
            { count: doctors.length, availability: filters.availability },
          )}
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
        <h1 className={styles.heading}>
          {t('search.title', 'Find the right doctor for what’s bothering you')}
        </h1>
        <p className={styles.subheading}>
          {t(
            'search.subtitle',
            'Describe a symptom — like “rash” or “chest pain” — and we’ll show doctors from the specialties that treat it. No medical training required.',
          )}
          {' '}
          <Link to="/patient/doctors">Browse by specialty</Link>
        </p>
      </header>

      {issues.length > 0 && (
        <div role="status" className={styles.notices}>
          {issues.map((issue) => (
            <p key={issue} className={styles.notice}>
              {noticeCopy(issue, t)}
            </p>
          ))}
        </div>
      )}

      <section className={styles.searchCard} aria-label={t('search.aria.symptom', 'Symptom search')}>
        <SymptomCombobox
          selectedSlug={filters.symptomSlug}
          selectedTerm={mapping?.term}
          onSelect={selectSymptom}
        />

        {filters.symptomSlug && (
          <div className={styles.appliedRow}>
            {mappingQuery.isFetching && (
              <p className={styles.appliedText}>
                {t('search.applied.matching', 'Matching your symptom to the specialties that treat it…')}
              </p>
            )}
            {!mappingQuery.isFetching && mappingQuery.isError && (
              <p className={styles.appliedText} role="alert">
                {t('search.applied.unknown', 'We don’t recognise “{slug}” any more.', {
                  slug: filters.symptomSlug,
                })}
              </p>
            )}
            {!mappingQuery.isFetching && mapping && (
              <p className={styles.appliedText} role="status">
                {t('search.applied.showing', 'Showing doctors in')} <strong>{specialtyListText}</strong>.
              </p>
            )}
            <Button variant="secondary" onClick={() => selectSymptom(null)}>
              {t('search.clearSymptom', 'Clear symptom')}
            </Button>
          </div>
        )}

        <AvailabilityFilter value={filters.availability} onChange={setAvailability} />
      </section>

      <section aria-label={t('search.aria.doctors', 'Doctors')} className={styles.results} aria-busy={doctorsQuery.isFetching}>
        {renderResults()}
      </section>
    </div>
  );
}
