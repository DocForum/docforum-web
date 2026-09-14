import { useEffect, useRef } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { gsap } from 'gsap';
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

  const heroRef = useRef<HTMLElement>(null);
  const threadSectionRef = useRef<HTMLElement>(null);
  const dotRefs = useRef<(SVGCircleElement | null)[]>([]);
  const lineRefs = useRef<(SVGLineElement | null)[]>([]);

  // Hero: one orchestrated entrance on mount — headline, then subhead, then
  // the CTAs. A single reveal, not per-section scroll effects scattered
  // down the page.
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const targets = hero.querySelectorAll('[data-reveal]');
        gsap.set(targets, { opacity: 0, y: 14 });
        gsap.to(targets, { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out', delay: 0.05 });
      });
      return () => mm.revert();
    }, hero);

    return () => ctx.revert();
  }, []);

  // Thread: each connector line draws itself in, left to right, and the
  // node at its far end pops as it arrives — the diagram extends the way
  // the thread it represents does. Then it holds, draws itself back out,
  // and repeats — a continuous, gentle loop (draw ~1.7s, hold ~1.4s, undraw
  // ~1.7s, pause ~1s) rather than a one-shot reveal. Runs only while the
  // section is actually on screen (an IntersectionObserver play()/pause()s
  // the timeline) so it doesn't spend cycles animating off-screen — core
  // GSAP only, no ScrollTrigger plugin installed.
  useEffect(() => {
    const section = threadSectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const dots = dotRefs.current.filter((el): el is SVGCircleElement => el !== null);
        const lines = lineRefs.current.filter((el): el is SVGLineElement => el !== null);

        gsap.set(dots, { scale: 0, transformOrigin: '50% 50%' });
        lines.forEach((line) => {
          const length = line.getTotalLength();
          gsap.set(line, { strokeDasharray: length, strokeDashoffset: length });
        });

        const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 1, yoyo: true });
        tl.to(dots[0], { scale: 1, duration: 0.3, ease: 'back.out(2)' });
        lines.forEach((line, i) => {
          tl.to(line, { strokeDashoffset: 0, duration: 0.35, ease: 'power2.out' });
          tl.to(dots[i + 1], { scale: 1, duration: 0.3, ease: 'back.out(2)' }, '-=0.15');
        });
        tl.to({}, { duration: 1.4 }); // hold fully-drawn before undrawing

        const observer = new IntersectionObserver(
          (entries) => {
            if (entries[0]?.isIntersecting) tl.play();
            else tl.pause();
          },
          { threshold: 0.3 },
        );
        observer.observe(section);

        return () => {
          observer.disconnect();
          tl.kill();
        };
      });
      return () => mm.revert();
    }, section);

    return () => ctx.revert();
  }, []);

  if (user) {
    const destination = DASHBOARD_BY_ROLE[user.role];
    if (destination) return <Navigate to={destination} replace />;
  }

  return (
    <div>
      <section className={styles.hero} ref={heroRef}>
        <h1 className={styles.headline} data-reveal>
          The hospital visit, collapsed into one thread.
        </h1>
        <p className={styles.subhead} data-reveal>
          A symptom becomes a booking, a referral, a structured order, and a settled fulfillment —
          without the patient repeating themselves at every desk, and without a facility getting
          paid until the work is actually confirmed done.
        </p>
        <div className={styles.ctaRow} data-reveal>
          <Link to="/signup" className={styles.ctaPrimary}>
            Get started
          </Link>
          <Link to="/login" className={styles.ctaSecondary}>
            Log in
          </Link>
        </div>
      </section>

      <section className={styles.thread} aria-label="How a visit flows through DocForum" ref={threadSectionRef}>
        <ol className={styles.threadList}>
          {THREAD.map((step, i) => {
            const isFinal = i === THREAD.length - 1;
            return (
              <li key={step.label} className={styles.threadStep}>
                <div className={styles.threadNode}>
                  <svg width="14" height="14" viewBox="0 0 14 14" className={styles.threadDotSvg}>
                    <circle
                      ref={(el) => {
                        dotRefs.current[i] = el;
                      }}
                      cx="7"
                      cy="7"
                      r={isFinal ? 6.5 : 5}
                      fill={isFinal ? 'var(--color-accent-2)' : 'var(--color-accent)'}
                    />
                  </svg>
                  {!isFinal && (
                    <svg className={styles.threadLineSvg} height="2" preserveAspectRatio="none">
                      <line
                        ref={(el) => {
                          lineRefs.current[i] = el;
                        }}
                        x1="0"
                        y1="1"
                        x2="100%"
                        y2="1"
                        stroke="var(--color-accent)"
                        strokeWidth="2"
                      />
                    </svg>
                  )}
                </div>
                <h3>{step.label}</h3>
                <p>{step.body}</p>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
