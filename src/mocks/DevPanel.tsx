// Development-only panel for mock mode (issue #95): role switcher, scenario
// toggles (empty states / forced errors), artificial latency, and fixture
// reset. Rendered into its own React root from src/mocks/setup.ts — the
// application tree itself never imports anything under src/mocks/.
import { useState } from 'react';
import { queryClient } from '../query-client';
import { resetDb } from './db';
import styles from './DevPanel.module.css';
import { useMockStore, type MockScenario } from './mock-store';
import { activateMockRole, mockSignOut } from './roles';
import type { Role } from '../types/models';

const ROLES: Role[] = ['patient', 'doctor', 'facility', 'admin'];
const SCENARIOS: MockScenario[] = ['normal', 'empty', 'error'];

export function DevPanel() {
  const [open, setOpen] = useState(true);
  const scenario = useMockStore((s) => s.scenario);
  const latencyMs = useMockStore((s) => s.latencyMs);
  const activeRole = useMockStore((s) => s.activeRole);
  const setScenario = useMockStore((s) => s.setScenario);
  const setLatencyMs = useMockStore((s) => s.setLatencyMs);

  if (!open) {
    return (
      <button type="button" className={styles.pill} onClick={() => setOpen(true)}>
        MOCK API
      </button>
    );
  }

  return (
    <aside className={styles.panel} aria-label="Mock API development panel">
      <div className={styles.header}>
        <span className={styles.title}>Mock API</span>
        <button type="button" className={styles.close} onClick={() => setOpen(false)}>
          Hide
        </button>
      </div>

      <p className={styles.warning}>
        All data is fake (example.test emails, demo personas). Nothing is persisted —
        fixtures reset on reload.
      </p>

      <div className={styles.group}>
        <span className={styles.groupLabel} id="mock-role-label">
          Signed in as
        </span>
        <div className={styles.segmented} role="group" aria-labelledby="mock-role-label">
          {ROLES.map((role) => (
            <button
              key={role}
              type="button"
              className={`${styles.option} ${activeRole === role ? styles.optionActive : ''}`}
              aria-pressed={activeRole === role}
              onClick={() => {
                activateMockRole(role);
                queryClient.invalidateQueries();
              }}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.group}>
        <span className={styles.groupLabel} id="mock-scenario-label">
          Scenario
        </span>
        <div className={styles.segmented} role="group" aria-labelledby="mock-scenario-label">
          {SCENARIOS.map((s) => (
            <button
              key={s}
              type="button"
              className={`${styles.option} ${scenario === s ? styles.optionActive : ''}`}
              aria-pressed={scenario === s}
              onClick={() => {
                setScenario(s);
                // Drop cached responses so the new scenario is visible
                // immediately instead of waiting for staleness.
                queryClient.invalidateQueries();
              }}
            >
              {s === 'normal' ? 'normal' : s === 'empty' ? 'empty states' : 'errors'}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.group}>
        <label className={styles.groupLabel} htmlFor="mock-latency">
          Response latency
        </label>
        <div className={styles.latencyRow}>
          <input
            id="mock-latency"
            type="range"
            min={0}
            max={3000}
            step={250}
            value={latencyMs}
            onChange={(e) => setLatencyMs(Number(e.target.value))}
          />
          <output className={styles.latencyValue} htmlFor="mock-latency">
            {latencyMs === 0 ? 'none' : `${latencyMs} ms`}
          </output>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.action}
          onClick={() => {
            resetDb();
            queryClient.invalidateQueries();
          }}
        >
          Reset data
        </button>
        <button type="button" className={styles.action} onClick={mockSignOut}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
