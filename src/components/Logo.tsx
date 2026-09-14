// Hexagon (network node — web3) containing a pulse line (vitals — medical).
// Single mark for both niches rather than two competing motifs.
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 2 L28.5 9 V23 L16 30 L3.5 23 V9 Z" fill="url(#docforum-logo-gradient)" />
      <path
        d="M7 17 H11.5 L14 12 L18 22 L20.5 17 H25"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <defs>
        <linearGradient id="docforum-logo-gradient" x1="3.5" y1="2" x2="28.5" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--color-accent)" />
          <stop offset="1" stopColor="var(--color-accent-2)" />
        </linearGradient>
      </defs>
    </svg>
  );
}
