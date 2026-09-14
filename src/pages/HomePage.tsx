import { Navigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import styles from './HomePage.module.css';

const DASHBOARD_BY_ROLE: Record<string, string> = {
  patient: '/patient',
  doctor: '/doctor',
  facility: '/facility',
};

const FEATURES = [
  {
    icon: (
      <path d="M12 3 4 7v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V7l-8-4Z" strokeLinecap="round" strokeLinejoin="round" />
    ),
    title: 'Context that follows you',
    body: 'A referral carries your intake and consultation notes forward — the specialist sees what the first doctor saw, so you never re-explain yourself at the next desk.',
  },
  {
    icon: (
      <>
        <rect x="3" y="4" width="18" height="17" rx="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 9h18M8 2v4M16 2v4" strokeLinecap="round" />
      </>
    ),
    title: 'Availability, not guesswork',
    body: 'Real-time slots with a database-level guarantee against double-booking — the same slot can never be given to two patients, under any load.',
  },
  {
    icon: (
      <path
        d="M12 2 21 6v6c0 5.5-3.8 9.7-9 11-5.2-1.3-9-5.5-9-11V6l9-4Z M9 12l2 2 4-4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    title: 'Escrow-secured fulfillment',
    body: 'Facility payment is held in a Soroban smart-contract escrow and released only on confirmed fulfillment — not on a facility’s self-report.',
  },
];

export function HomePage() {
  const user = useAuthStore((state) => state.user);

  if (user) {
    const destination = DASHBOARD_BY_ROLE[user.role];
    if (destination) return <Navigate to={destination} replace />;
  }

  return (
    <div>
      <section className={`${styles.hero} dot-grid`}>
        <span className={styles.eyebrow}>Care continuity, verified on-chain fulfillment</span>
        <h1 className={styles.headline}>
          One continuous thread from <span className={styles.gradientText}>symptom</span> to{' '}
          <span className={styles.gradientText}>settled order</span>.
        </h1>
        <p className={styles.subhead}>
          DocForum collapses the multi-visit, multi-queue hospital journey into a single digital
          thread — booking, referral, prescription, and lab order, fulfilled at a qualified partner
          facility with escrow-backed payment integrity.
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

      <section className={styles.features}>
        {FEATURES.map((feature) => (
          <article key={feature.title} className={styles.featureCard}>
            <svg className={styles.featureIcon} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              {feature.icon}
            </svg>
            <h3>{feature.title}</h3>
            <p>{feature.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
