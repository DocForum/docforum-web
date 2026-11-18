import { useEffect } from 'react';
import type { RefObject } from 'react';

type Motion = typeof import('gsap').gsap;
type MotionSetup<T extends Element> = (gsap: Motion, scope: T) => void | (() => void);

export function useMotion<T extends Element>(
  scopeRef: RefObject<T | null>,
  setup: MotionSetup<T>,
) {
  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return;

    let cancelled = false;
    let revert: (() => void) | undefined;

    void import('gsap')
      .then(({ gsap }) => {
        if (cancelled) return;
        const media = gsap.matchMedia();
        let setupError: unknown;
        const context = gsap.context(() => {
          media.add('(prefers-reduced-motion: no-preference)', () => {
            try {
              return setup(gsap, scope);
            } catch (error) {
              setupError = error;
            }
          });
        }, scope);
        revert = () => {
          media.revert();
          context.revert();
        };
        // Fail open: a setup usually hides its targets (gsap.set opacity 0)
        // before animating them in, so a setup that throws part-way would leave
        // the content invisible. Reverting the context undoes those sets.
        if (setupError !== undefined) {
          console.error('Motion setup failed; showing content without animation', setupError);
          revert();
          revert = undefined;
          return;
        }
        if (cancelled) revert();
      })
      .catch((error: unknown) => {
        console.error('Unable to load the motion runtime', error);
      });

    return () => {
      cancelled = true;
      revert?.();
    };
  }, [scopeRef, setup]);
}

export function motionDuration(
  token: `--motion-duration-${string}`,
): number {
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  // Accepts a leading dot: the production CSS minifier rewrites `100ms` as
  // `.1s`, and rejecting that left the home page hero invisible on Pages.
  const match = /^(\d*\.?\d+)(ms|s)$/.exec(value);
  if (!match) throw new Error(`Invalid motion duration token: ${token}`);
  const duration = Number(match[1]);
  return match[2] === 'ms' ? duration / 1000 : duration;
}

export function motionEase(
  token: `--motion-ease-gsap-${string}`,
): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  if (!value) throw new Error(`Missing motion easing token: ${token}`);
  return value;
}
