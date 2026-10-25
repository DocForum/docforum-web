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
        const context = gsap.context(() => {
          media.add('(prefers-reduced-motion: no-preference)', () => setup(gsap, scope));
        }, scope);
        revert = () => {
          media.revert();
          context.revert();
        };
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
  const match = /^(\d+(?:\.\d+)?)(ms|s)$/.exec(value);
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
