import { useCallback, useRef } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { motionDuration, motionEase, useMotion } from '../hooks/useMotion';
import { useAuthStore } from '../store/auth-store';
import { useT } from '../i18n/useT';
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
  {
    key: 'book',
    labelDefault: 'Book',
    bodyDefault: 'Real availability, held with a database-level lock — never double-booked.',
  },
  {
    key: 'refer',
    labelDefault: 'Refer',
    bodyDefault: 'Intake and notes travel with the referral. Nothing re-explained at the next desk.',
  },
  {
    key: 'order',
    labelDefault: 'Order',
    bodyDefault: 'Structured prescriptions and lab orders a pharmacy or lab can act on unambiguously.',
  },
  {
    key: 'settle',
    labelDefault: 'Settle',
    bodyDefault: 'Facility payment sits in a Soroban escrow contract, released on confirmed fulfillment.',
  },
];

export function HomePage() {
  const user = useAuthStore((state) => state.user);
  const t = useT();

  const heroRef = useRef<HTMLElement>(null);
  const threadSectionRef = useRef<HTMLElement>(null);
  const dotRefs = useRef<(SVGCircleElement | null)[]>([]);
  const lineRefs = useRef<(SVGLineElement | null)[]>([]);

  const animateHero = useCallback((gsap: typeof import('gsap').gsap, hero: HTMLElement) => {
    const targets = hero.querySelectorAll('[data-reveal]');
    gsap.set(targets, { opacity: 0, y: 14 });
    gsap.to(targets, {
      opacity: 1,
      y: 0,
      duration: motionDuration('--motion-duration-hero-reveal'),
      stagger: motionDuration('--motion-duration-hero-stagger'),
      ease: motionEase('--motion-ease-gsap-out'),
      delay: motionDuration('--motion-duration-hero-delay'),
    });
  }, []);
  useMotion(heroRef, animateHero);

  // The observer keeps the repeating diagram paused while it is off-screen.
  const animateThread = useCallback((gsap: typeof import('gsap').gsap, section: HTMLElement) => {
    const dots = dotRefs.current.filter((el): el is SVGCircleElement => el !== null);
    const lines = lineRefs.current.filter((el): el is SVGLineElement => el !== null);
    const duration = (token: `--motion-duration-${string}`) => motionDuration(token);

    gsap.set(dots, { scale: 0, transformOrigin: '50% 50%' });
    lines.forEach((line) => {
      const length = line.getTotalLength();
      gsap.set(line, { strokeDasharray: length, strokeDashoffset: length });
    });

    const tl = gsap.timeline({
      paused: true,
      repeat: -1,
      repeatDelay: duration('--motion-duration-thread-repeat-delay'),
      yoyo: true,
    });
    tl.to(dots[0], {
      scale: 1,
      duration: duration('--motion-duration-node-pop'),
      ease: motionEase('--motion-ease-gsap-pop'),
    });
    lines.forEach((line, i) => {
      tl.to(line, {
        strokeDashoffset: 0,
        duration: duration('--motion-duration-thread-line'),
        ease: motionEase('--motion-ease-gsap-out'),
      });
      tl.to(
        dots[i + 1],
        {
          scale: 1,
          duration: duration('--motion-duration-node-pop'),
          ease: motionEase('--motion-ease-gsap-pop'),
        },
        `-=${duration('--motion-duration-node-pop') / 2}`,
      );
    });
    tl.to({}, { duration: duration('--motion-duration-thread-hold') });

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
  }, []);
  useMotion(threadSectionRef, animateThread);

  if (user) {
    const destination = DASHBOARD_BY_ROLE[user.role];
    if (destination) return <Navigate to={destination} replace />;
  }

  const steps = THREAD.map((step) => ({
    key: step.key,
    label: t(`home.step.${step.key}.label`, step.labelDefault),
    body: t(`home.step.${step.key}.body`, step.bodyDefault),
  }));

  return (
    <div>
      <section className={styles.hero} ref={heroRef}>
        <h1 className={styles.headline} data-reveal>
          {t('home.headline', 'The hospital visit, collapsed into one thread.')}
        </h1>
        <p className={styles.subhead} data-reveal>
          {t(
            'home.subhead',
            'A symptom becomes a booking, a referral, a structured order, and a settled fulfillment — without the patient repeating themselves at every desk, and without a facility getting paid until the work is actually confirmed done.',
          )}
        </p>
        <div className={styles.ctaRow} data-reveal>
          <Link to="/signup" className={styles.ctaPrimary}>
            {t('home.getStarted', 'Get started')}
          </Link>
          <Link to="/login" className={styles.ctaSecondary}>
            {t('home.logIn', 'Log in')}
          </Link>
        </div>
      </section>

      <section
        className={styles.thread}
        aria-label={t('home.threadAria', 'How a visit flows through DocForum')}
        ref={threadSectionRef}
      >
        <h2 className="srOnly">{t('home.threadHeading', 'The care thread')}</h2>
        <ol className={styles.threadList}>
          {steps.map((step, i) => {
            const isFinal = i === steps.length - 1;
            return (
              <li key={step.key} className={styles.threadStep}>
                <div className={styles.threadNode}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    className={styles.threadDotSvg}
                    aria-hidden="true"
                    focusable="false"
                  >
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
                    <svg
                      className={styles.threadLineSvg}
                      height="2"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                      focusable="false"
                    >
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
                <h2>{step.label}</h2>
                <p>{step.body}</p>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
