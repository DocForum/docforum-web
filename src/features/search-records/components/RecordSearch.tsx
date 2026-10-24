import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { KeyboardEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/auth-store';
import { useProfileStore } from '../../../store/profile-store';
import { useCareThreads } from '../../care-thread/hooks/useCareThread';
import { useAppointments } from '../../queue/hooks/useQueue';
import { useMessageThreads } from '../../messaging/hooks/useMessageThreads';
import { createRecordIndex, findRecords, flattenRecords } from '../index';
import type { RecordKind, SearchRecord } from '../index';
import styles from './RecordSearch.module.css';

const GROUPS: { kind: RecordKind; label: string }[] = [
  { kind: 'appointment', label: 'Appointments' },
  { kind: 'order', label: 'Orders' },
  { kind: 'result', label: 'Results' },
  { kind: 'message', label: 'Messages' },
];

export function RecordSearch() {
  const user = useAuthStore((state) => state.user);
  const selectedProfileId = useProfileStore((state) => state.selectedProfileId);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const previousUserId = useRef(user?.id ?? null);

  const subscribe = useCallback(
    (notify: () => void) => queryClient.getQueryCache().subscribe(notify),
    [queryClient],
  );
  const getSnapshot = useCallback(
    () =>
      queryClient
        .getQueryCache()
        .getAll()
        .filter((cachedQuery) => {
          const key = cachedQuery.queryKey;
          if (user?.role === 'patient') return key[0] === 'care-threads' && key[1] === selectedProfileId;
          if (user?.role === 'doctor') {
            return key[0] === 'doctor'
              && ((key[1] === 'appointments' && key[2] === 'today')
                || (key[1] === 'messages' && key[2] === 'threads'));
          }
          return false;
        })
        .map((cachedQuery) => `${cachedQuery.queryHash}:${cachedQuery.state.dataUpdatedAt}:${cachedQuery.state.dataUpdateCount}`)
        .join('|'),
    [queryClient, selectedProfileId, user?.role],
  );
  const cacheVersion = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    const userId = user?.id ?? null;
    if (previousUserId.current !== userId) queryClient.clear();
    previousUserId.current = userId;
  }, [queryClient, user?.id]);

  useEffect(() => {
    setQuery('');
    setActiveIndex(-1);
  }, [user?.id, selectedProfileId]);

  const index = useMemo(
    () => createRecordIndex(queryClient, user?.role ?? null, selectedProfileId),
    [cacheVersion, queryClient, user?.role, selectedProfileId],
  );
  const grouped = useMemo(() => findRecords(index, query), [index, query]);
  const results = useMemo(() => flattenRecords(grouped).slice(0, 12), [grouped]);
  const isOpen = Boolean(query.trim());
  const activeRecord = results[activeIndex];

  if (!user || (user.role !== 'patient' && user.role !== 'doctor')) return null;

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setQuery('');
      setActiveIndex(-1);
    } else if (event.key === 'ArrowDown' && results.length > 0) {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % results.length);
    } else if (event.key === 'ArrowUp' && results.length > 0) {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? results.length - 1 : current - 1));
    } else if (event.key === 'Enter' && activeRecord) {
      navigate(activeRecord.href);
      setQuery('');
      setActiveIndex(-1);
    }
  }

  let optionIndex = 0;
  return (
    <>
      <SearchDataLoader role={user.role} />
      <div className={styles.search}>
        <label className={styles.visuallyHidden} htmlFor="record-search">Search your records</label>
        <input
          id="record-search"
          className={styles.input}
          type="search"
          role="combobox"
          aria-label="Search your records"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls="record-search-results"
          aria-activedescendant={activeRecord ? optionId(activeRecord) : undefined}
          placeholder="Search records"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(-1);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setActiveIndex(-1)}
        />
        {isOpen && (
          <div className={styles.results} id="record-search-results" role="listbox" aria-label="Search results">
            {results.length === 0 ? (
              <p className={styles.empty} role="status">No matching records found.</p>
            ) : (
              GROUPS.map(({ kind, label }) => {
                const group = grouped[kind].filter((record) => results.includes(record));
                if (group.length === 0) return null;
                return (
                  <div
                    className={styles.group}
                    key={kind}
                    role="group"
                    aria-labelledby={`record-search-group-${kind}`}
                  >
                    <h2 className={styles.groupTitle} id={`record-search-group-${kind}`}>{label}</h2>
                    {group.map((record) => {
                      const currentIndex = optionIndex++;
                      return (
                        <RecordOption
                          key={`${kind}:${record.id}`}
                          record={record}
                          index={currentIndex}
                          active={currentIndex === activeIndex}
                          onSelect={() => {
                            setQuery('');
                            setActiveIndex(-1);
                          }}
                        />
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </>
  );
}

function SearchDataLoader({ role }: { role: 'patient' | 'doctor' }) {
  return role === 'patient' ? <PatientSearchDataLoader /> : <DoctorSearchDataLoader />;
}

function PatientSearchDataLoader() {
  useCareThreads();
  return null;
}

function DoctorSearchDataLoader() {
  useAppointments();
  useMessageThreads({ filter: 'all', cursor: null, limit: 10 });
  return null;
}

function RecordOption({
  record,
  index,
  active,
  onSelect,
}: {
  record: SearchRecord;
  index: number;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <Link
      id={optionId(record)}
      className={styles.option}
      to={record.href}
      role="option"
      aria-selected={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onSelect}
      data-option-index={index}
    >
      <span className={styles.optionTitle}>{record.title}</span>
      {record.detail && <span className={styles.optionDetail}>{record.detail}</span>}
    </Link>
  );
}

function optionId(record: SearchRecord) {
  return `record-search-option-${record.kind}-${record.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}
