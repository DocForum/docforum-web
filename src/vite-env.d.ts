/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** Set only by `npm run dev:mock` — enables the MSW mock API (issue #95). */
  readonly VITE_ENABLE_MOCKS?: string;
  /** Pay-with-wallet feature flag (issue #59), default off. ADR 0005 calls
   * patient-wallet payment "an option, not the default", so the UI only
   * renders the flow when this is exactly 'true' at build time. */
  readonly VITE_PAY_WITH_WALLET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
