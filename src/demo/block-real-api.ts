// Demo mode must never reach the real backend (issue #127). Every origin the
// app could believe is the real API gets a catch-all handler that answers
// 503; because MSW matches handlers in order and these are appended after
// the seeded ones, the mocked endpoints still win while anything unmocked is
// refused instead of leaking to the network.
import { HttpResponse, http } from 'msw';

/** The configured API origin plus the local-dev default, de-duplicated. */
export function demoApiOrigins(): string[] {
  const configured = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
  return [...new Set([configured, 'http://localhost:4000'])].map((origin) =>
    origin.replace(/\/+$/, ''),
  );
}

export const realApiBlockers = demoApiOrigins().map((origin) =>
  http.all(`${origin}/*`, () =>
    HttpResponse.json(
      {
        message:
          'Demo mode: the real DocForum API is blocked. Every screen is backed by in-browser fixtures.',
      },
      { status: 503 },
    ),
  ),
);
