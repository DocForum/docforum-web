// ESLint flat config — modest on purpose (issue #11): the point is to catch
// React-specific mistakes `tsc` cannot (conditional hooks, missing hook
// dependencies), not to reformat the codebase.
//
// It also enforces the architecture rules that used to be review-only
// (issue #299):
//  - raw `fetch` only through the shared services,
//  - browser storage only for the time-zone preference (never tokens or PHI),
//  - `MOCK_*`/`DEFAULT_MOCK_*` fixtures only in mocks and tests,
//  - new route literals go through `src/routes/paths.ts` (issue #300).
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

// `src/routes/paths.ts` is the one place route strings live.
const noRouteLiterals = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Build route targets through src/routes/paths.ts' },
    schema: [],
    messages: {
      literal:
        'Use a builder from `src/routes/paths.ts` (or `patientSections` for relative links) instead of a hand-written route string.',
    },
  },
  create(context) {
    const isRouteLiteral = (node) =>
      node?.type === 'Literal' &&
      typeof node.value === 'string' &&
      node.value.startsWith('/');

    return {
      JSXAttribute(node) {
        if (node.name?.name !== 'to') return;
        if (isRouteLiteral(node.value)) context.report({ node: node.value, messageId: 'literal' });
      },
      CallExpression(node) {
        if (node.callee?.type !== 'Identifier' || node.callee.name !== 'navigate') return;
        if (isRouteLiteral(node.arguments[0])) {
          context.report({ node: node.arguments[0], messageId: 'literal' });
        }
      },
    };
  },
};

const RAW_FETCH = {
  selector: "CallExpression[callee.name='fetch']",
  message:
    'Call the API through `src/services/api-client.ts` (or the package client), not raw `fetch` (ARCHITECTURE_ESSENTIALS hard rule 1).',
};
const BROWSER_STORAGE = {
  selector: "MemberExpression[object.name=/^(localStorage|sessionStorage)$/]",
  message:
    'Browser storage is only allowed for UI preferences (`src/i18n/time-zone.ts`, `src/utils/theme.ts`); session and personal data stay in memory (ARCHITECTURE_ESSENTIALS).',
};
const WINDOW_STORAGE = {
  selector: "MemberExpression[object.name='window'][property.name=/^(localStorage|sessionStorage)$/]",
  message:
    'Browser storage is only allowed for UI preferences (`src/i18n/time-zone.ts`, `src/utils/theme.ts`); session and personal data stay in memory (ARCHITECTURE_ESSENTIALS).',
};
const MOCK_FIXTURE = {
  selector: 'Identifier[name=/^(DEFAULT_)?MOCK_/]',
  message:
    '`MOCK_*`/`DEFAULT_MOCK_*` fixtures belong in `src/mocks/` or tests, never in shipped components or services.',
};

const GUARDED = ['src/**/*.{ts,tsx}', 'packages/api-client/src/**/*.ts'];
const NOT_SHIPPED = [
  '**/*.test.{ts,tsx}',
  'src/test/**',
  'src/mocks/**',
  'e2e/**',
  'packages/api-client/src/generated/**',
];

export default tseslint.config(
  {
    ignores: [
      'dist/',
      'dist-ssr/',
      'node_modules/',
      'coverage/',
      'docforum-core/',
      'packages/api-client/src/generated/',
      'playwright-report/',
      'test-results/',
      '*.tsbuildinfo',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Architecture guards. Tests, mocks and the vendored client's generated
    // types legitimately need these patterns, so they are out of scope.
    files: GUARDED,
    ignores: NOT_SHIPPED,
    rules: {
      'no-restricted-syntax': [
        'error',
        RAW_FETCH,
        BROWSER_STORAGE,
        WINDOW_STORAGE,
        MOCK_FIXTURE,
      ],
    },
  },
  {
    // The shared client and the two services that must own the network and
    // storage edges are the allowlist (issue #299).
    files: [
      'src/services/api-client.ts',
      'src/services/event-stream-service.ts',
      'src/utils/analytics.ts',
      'packages/api-client/src/client.ts',
    ],
    rules: {
      'no-restricted-syntax': ['error', BROWSER_STORAGE, WINDOW_STORAGE, MOCK_FIXTURE],
    },
  },
  {
    files: ['src/i18n/time-zone.ts', 'src/utils/theme.ts'],
    rules: {
      'no-restricted-syntax': ['error', RAW_FETCH, MOCK_FIXTURE],
    },
  },
  {
    // Route literals are a warning, not an error: main still has many
    // `to="/..."` links awaiting migration (#300), but new ones should use
    // the typed table.
    files: ['src/**/*.{ts,tsx}'],
    ignores: [...NOT_SHIPPED, 'src/routes/paths.ts', 'src/pages/public-routes.ts'],
    plugins: { local: { rules: { 'no-route-literals': noRouteLiterals } } },
    rules: {
      'local/no-route-literals': 'warn',
    },
  },
  {
    // Test doubles legitimately need `any` (mock event objects, partial
    // Sentry events) and the casts are local to assertions; keeping the
    // rule on for production code is what matters.
    files: ['**/*.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
  {
    // Classic browser scripts copied verbatim into the build by Vite. They run
    // outside the module graph (prehydrate-locale.js), so they get browser
    // globals rather than the Node ones used by build scripts.
    files: ['public/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser },
    },
  },
  {
    files: ['e2e/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      // Playwright's fixture API passes a callback named `use` (as in
      // `({ page }, use) => ...`), which the React hook rules misread as
      // React's `use()`. These specs contain no React components at all,
      // so the rule has nothing to check here.
      'react-hooks/rules-of-hooks': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
);
