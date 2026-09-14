// A hexagon threshold (hospitality: a welcoming frame, and web3: a node)
// holding a three-point path (the thread a patient's care follows). Solid
// colors only — pine for the frame and path, brass for the path's final
// point, marking where value actually settles.
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M16 2.5 L28 9.25 V22.75 L16 29.5 L4 22.75 V9.25 Z"
        stroke="var(--color-accent)"
        strokeWidth="1.75"
      />
      <path d="M9 20 L14 12 L19 17 L24 11" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="9" cy="20" r="1.6" fill="var(--color-accent)" />
      <circle cx="14" cy="12" r="1.6" fill="var(--color-accent)" />
      <circle cx="19" cy="17" r="1.6" fill="var(--color-accent)" />
      <circle cx="24" cy="11" r="2" fill="var(--color-accent-2)" />
    </svg>
  );
}
