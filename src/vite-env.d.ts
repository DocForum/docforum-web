/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** Set only by `npm run dev:mock` — enables the MSW mock API (issue #95). */
  readonly VITE_ENABLE_MOCKS?: string;
  /** Age at which a dependent needs their own account. Defaults to 18. */
  readonly VITE_AGE_OF_MAJORITY_YEARS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
