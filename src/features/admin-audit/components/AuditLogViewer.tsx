import { useId, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { useAuditFilters } from '../hooks/useAuditFilters';
import { hasActiveFilters } from '../filters';
import { AuditFilterForm } from './AuditFilterForm';
import { AuditEventsPanel } from './AuditEventsPanel';
import { AccessLogsPanel } from './AccessLogsPanel';
import type { AuditTab } from '../filters';
import styles from './AuditLogViewer.module.css';

const TABS: { id: AuditTab; label: string; description: string }[] = [
  {
    id: 'events',
    label: 'State changes',
    description: 'Who booked, verified, funded or released what — every attributable transition (PRD §7).',
  },
  {
    id: 'access',
    label: 'Record access',
    description: 'Who viewed which clinical record, and through which route.',
  },
];

/**
 * Admin audit console. All state — tab, filters and page position — lives in
 * the URL (see `useAuditFilters`), and only one server page is ever held.
 * Rows are rendered, never logged: nothing here writes to the console.
 */
export function AuditLogViewer() {
  const { filters, issues, pageNumber, applyFilters, clearFilters, selectTab, goOlder, goNewer, goNewest } =
    useAuditFilters();
  const baseId = useId();
  const tabRefs = useRef<Record<AuditTab, HTMLButtonElement | null>>({ events: null, access: null });

  // Arrow-key roving focus, per the WAI-ARIA tabs pattern.
  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const index = TABS.findIndex((tab) => tab.id === filters.tab);
    const next = TABS[(index + (event.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length].id;
    selectTab(next);
    tabRefs.current[next]?.focus();
  };

  const activeTab = TABS.find((tab) => tab.id === filters.tab) ?? TABS[0];
  const draft = {
    entityType: filters.entityType,
    entityId: filters.entityId,
    actor: filters.actor,
    action: filters.action,
    from: filters.from,
    to: filters.to,
  };
  const panelProps = { filters, pageNumber, onOlder: goOlder, onNewer: goNewer, onNewest: goNewest };

  return (
    <section className={styles.viewer} aria-labelledby={`${baseId}-title`}>
      <header className={styles.header}>
        <h1 id={`${baseId}-title`}>Audit trail</h1>
        <p className={styles.subtitle}>
          Read-only view of docforum-core's append-only audit records. Filters are kept in the address bar, so any
          view can be bookmarked or shared with another admin.
        </p>
      </header>

      <div role="tablist" aria-label="Audit record type" className={styles.tabs}>
        {TABS.map((tab) => {
          const selected = tab.id === filters.tab;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                tabRefs.current[tab.id] = node;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel`}
              tabIndex={selected ? 0 : -1}
              className={`${styles.tab} ${selected ? styles.tabActive : ''}`}
              onClick={() => selectTab(tab.id)}
              onKeyDown={handleTabKeyDown}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${activeTab.id}`}
        className={styles.panel}
      >
        <p className={styles.tabDescription}>{activeTab.description}</p>

        {issues.length > 0 && (
          <div className={styles.notice} role="status">
            <p>Some filters in this link were ignored:</p>
            <ul>
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        <AuditFilterForm
          // Remount on any URL change so the inputs always show what's applied.
          key={`${filters.tab}|${Object.values(draft).join('|')}`}
          tab={filters.tab}
          initial={draft}
          canClear={hasActiveFilters(filters)}
          onApply={applyFilters}
          onClear={clearFilters}
        />

        {filters.tab === 'events' ? <AuditEventsPanel {...panelProps} /> : <AccessLogsPanel {...panelProps} />}
      </div>
    </section>
  );
}
