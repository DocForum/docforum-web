import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

// A hexagon threshold (hospitality: a welcoming frame, and web3: a node)
// holding a three-point path (the thread a patient's care follows). Solid
// colors only — pine for the frame and path, brass for the path's final
// point, marking where value actually settles.
//
// The path draws itself in once on mount (SVG stroke-dasharray/dashoffset,
// driven by GSAP) — a single, quiet brand moment, not a loop. Respects
// prefers-reduced-motion via gsap.matchMedia(): reduced-motion users get
// the finished mark immediately, no animation.
export function Logo({ size = 28 }: { size?: number }) {
  const pathRef = useRef<SVGPathElement>(null);
  const dotRefs = useRef<(SVGCircleElement | null)[]>([]);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const length = path.getTotalLength();
        gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
        gsap.set(dotRefs.current, { scale: 0, transformOrigin: '50% 50%' });

        const tl = gsap.timeline({ delay: 0.1 });
        tl.to(path, { strokeDashoffset: 0, duration: 0.6, ease: 'power2.out' });
        tl.to(dotRefs.current, { scale: 1, duration: 0.3, stagger: 0.07, ease: 'back.out(2)' }, '-=0.3');
      });
      return () => mm.revert();
    });

    return () => ctx.revert();
  }, []);

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 2.5 L28 9.25 V22.75 L16 29.5 L4 22.75 V9.25 Z" stroke="var(--color-accent)" strokeWidth="1.75" />
      <path
        ref={pathRef}
        d="M9 20 L14 12 L19 17 L24 11"
        stroke="var(--color-accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle ref={(el) => { dotRefs.current[0] = el; }} cx="9" cy="20" r="1.6" fill="var(--color-accent)" />
      <circle ref={(el) => { dotRefs.current[1] = el; }} cx="14" cy="12" r="1.6" fill="var(--color-accent)" />
      <circle ref={(el) => { dotRefs.current[2] = el; }} cx="19" cy="17" r="1.6" fill="var(--color-accent)" />
      <circle ref={(el) => { dotRefs.current[3] = el; }} cx="24" cy="11" r="2" fill="var(--color-accent-2)" />
    </svg>
  );
}
