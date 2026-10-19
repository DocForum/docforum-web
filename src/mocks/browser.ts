// MSW service worker for browser mock mode. Only ever loaded from
// src/mocks/setup.ts, which itself is only dynamically imported by
// main.tsx when running `npm run dev:mock` (DEV build + VITE_ENABLE_MOCKS).
// Production builds eliminate that import entirely — verified in CI by
// `npm run check:dist` (scripts/check-dist-no-mocks.mjs).
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
