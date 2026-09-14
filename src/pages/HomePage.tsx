import { Navigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import styles from './HomePage.module.css';

const DASHBOARD_BY_ROLE: Record<string, string> = {
  patient: '/patient',
  doctor: '/doctor',
  facility: '/facility',
};

// The content genuinely is a sequence — booking leads to referral leads to
// an order leads to escrow-settled fulfillment — so a connected path, not
// a grid of interchangeable cards, is the honest structural device here.
const THREAD = [
  { label: 'Book', body: 'Real availability, held with a database-level lock — never double-booked.' },
  { label: 'Refer', body: 'Intake and notes travel with the referral. Nothing re-explained at the next desk.' },
  { label: 'Order', body: 'Structured prescriptions and lab orders a pharmacy or lab can act on unambiguously.' },
  { label: 'Settle', body: 'Facility payment sits in a Soroban escrow contract, released on confirmed fulfillment.' },
];

export function HomePage() {
  const user = useAuthStore((state) => state.user);

  if (user) {
    const destination = DASHBOARD_BY_ROLE[user.role];
    if (destination) return <Navigate to={destination} replace />;
  }

  return (
    <div>
      <section className={styles.hero}>
        <h1 className={styles.headline}>The hospital visit, collapsed into one thread.</h1>
        <p className={styles.subhead}>
          A symptom becomes a booking, a referral, a structured order, and a settled fulfillment —
          without the patient repeating themselves at every desk, and without a facility getting
          paid until the work is actually confirmed done.
        </p>
        <div className={styles.ctaRow}>
          <Link to="/signup" className={styles.ctaPrimary}>
            Get started
          </Link>
          <Link to="/login" className={styles.ctaSecondary}>
            Log in
          </Link>
        </div>
      </section>

      <section className={styles.thread} aria-label="How a visit flows through DocForum">
        <ol className={styles.threadList}>
          {THREAD.map((step, i) => (
            <li key={step.label} className={styles.threadStep}>
              <div className={styles.threadNode}>
                <span className={styles.threadDot} />
                {i < THREAD.length - 1 && <span className={styles.threadLine} />}
              </div>
              <h3>{step.label}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
