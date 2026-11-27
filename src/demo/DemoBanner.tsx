// Demo chrome (issue #127): the persistent "no real data" banner and the
// role picker. Mounted into its own React root by bootstrap.tsx so the
// application tree never imports demo code.
import { useEffect, useRef } from 'react';
import { exitDemoMode, useDemoStore, DEMO_ROLES } from './demo-store';
import styles from './DemoBanner.module.css';
import type { Role } from '../types/models';

const ROLE_COPY: Record<Role, { title: string; body: string }> = {
  patient: {
    title: 'Patient',
    body: 'Book a visit, follow one care thread, manage dependants and health records.',
  },
  doctor: {
    title: 'Doctor',
    body: "Run today's live queue, sign notes, answer the inbox, see practice insights.",
  },
  facility: {
    title: 'Facility',
    body: 'Fulfil orders, scan a prescription token, manage staff, read the payout ledger.',
  },
  admin: {
    title: 'Admin',
    body: 'Drive payments, unblock referrals, review audit logs, flags and system health.',
  },
};

export function DemoBanner() {
  const role = useDemoStore((state) => state.role);
  const pickerOpen = useDemoStore((state) => state.pickerOpen);
  const chooseRole = useDemoStore((state) => state.chooseRole);
  const openPicker = useDemoStore((state) => state.openPicker);
  const closePicker = useDemoStore((state) => state.closePicker);
  const firstOptionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    firstOptionRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePicker();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [pickerOpen, closePicker]);

  return (
    <>
      {pickerOpen && (
        <div
          className={styles.backdrop}
          onClick={(event) => {
            if (event.target === event.currentTarget) closePicker();
          }}
        >
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-picker-title"
            aria-describedby="demo-picker-note"
          >
            <h2 id="demo-picker-title" className={styles.title}>
              Explore DocForum
            </h2>
            <p className={styles.subtitle}>
              Pick a role to jump straight in. No account, no backend — every screen runs on
              in-browser sample data.
            </p>
            <div className={styles.roles}>
              {DEMO_ROLES.map((option, index) => (
                <button
                  key={option}
                  ref={index === 0 ? firstOptionRef : undefined}
                  type="button"
                  className={styles.roleOption}
                  aria-pressed={role === option}
                  onClick={() => chooseRole(option)}
                >
                  <span className={styles.roleTitle}>{ROLE_COPY[option].title}</span>
                  <span className={styles.roleBody}>{ROLE_COPY[option].body}</span>
                </button>
              ))}
            </div>
            <p id="demo-picker-note" className={styles.note}>
              Demo data is invented and deliberately obvious: names say “(fake)” and every email
              ends in <code>@example.test</code>. Nothing you do here is saved.
            </p>
            {role && (
              <button type="button" className={styles.cancel} onClick={closePicker}>
                Keep exploring as {ROLE_COPY[role].title.toLowerCase()}
              </button>
            )}
          </div>
        </div>
      )}

      <div className={styles.banner} role="region" aria-label="Demo mode">
        <span className={styles.badge}>Demo</span>
        <p className={styles.message}>
          <strong>Demo — no real data.</strong> Requests to the real API are blocked.
        </p>
        {role && <span className={styles.currentRole}>{ROLE_COPY[role].title} view</span>}
        <div className={styles.actions}>
          <button type="button" className={styles.action} onClick={openPicker}>
            Switch role
          </button>
          <button type="button" className={`${styles.action} ${styles.exit}`} onClick={exitDemoMode}>
            Exit demo
          </button>
        </div>
      </div>
    </>
  );
}
