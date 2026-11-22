// Shared plumbing for mock handlers: applies the dev-panel scenario
// (forced errors, empty datasets) and artificial latency uniformly, so
// individual handlers only express the happy path + domain logic.
import { HttpResponse, type PathParams } from 'msw';
import { useMockStore } from './mock-store';

// MSW's `HttpResponse<T>` is invariant in T; `unknown` does not satisfy its
// `DefaultBodyType` constraint and breaks every handler's return type. `any`
// is the correct escape hatch for a response of any JSON shape here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyHttpResponse = HttpResponse<any>;

export interface MockResolverArgs {
  params: PathParams;
  request: Request;
}

export type MockResolveFn = (
  args: MockResolverArgs,
) => unknown | Promise<unknown>;

export type ResponseKind =
  | 'json' // normal JSON body (mutations and singletons)
  | 'list' // array body — becomes [] under the "empty" scenario
  | 'nullable' // optional singleton — becomes null under the "empty" scenario
  | 'void'; // body-less success

const FORCED_ERROR_MESSAGE = 'Mock scenario: forced server error (dev panel)';

async function applyScenario(): Promise<AnyHttpResponse | null> {
  const { scenario, latencyMs } = useMockStore.getState();
  if (latencyMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, latencyMs));
  }
  if (scenario === 'error') {
    return HttpResponse.json({ message: FORCED_ERROR_MESSAGE }, { status: 500 });
  }
  if (scenario === 'network-once') {
    useMockStore.getState().setScenario('normal');
    return HttpResponse.error();
  }
  return null;
}

/**
 * Wrap a mock resolver so every endpoint honours the dev panel's scenario
 * and latency settings. Resolvers may return a bare `HttpResponse` to
 * control status codes (404/409); anything else is JSON-serialized.
 */
export function respond(
  kind: ResponseKind,
  resolve: MockResolveFn,
): (args: MockResolverArgs) => Promise<AnyHttpResponse> {
  return async ({ params, request }) => {
    const { scenario } = useMockStore.getState();
    const forced = await applyScenario();
    if (forced) return forced;
    if (scenario === 'empty' && kind === 'list') return HttpResponse.json([]);
    if (scenario === 'empty' && kind === 'nullable') return HttpResponse.json(null);

    const body = await resolve({ params, request });
    if (body instanceof HttpResponse) return body;
    if (kind === 'void') return HttpResponse.json(null);
    return HttpResponse.json(body ?? null);
  };
}

/** 404 helper with the `{ message }` envelope api-client.ts expects. */
export function notFound(what: string): AnyHttpResponse {
  return HttpResponse.json({ message: `Mock API: ${what} not found` }, { status: 404 });
}

/** 409 helper with the `{ message }` envelope api-client.ts expects. */
export function conflict(message: string): AnyHttpResponse {
  return HttpResponse.json({ message: `Mock API: ${message}` }, { status: 409 });
}

/** 400 helper with the `{ message }` envelope api-client.ts expects. */
export function badRequest(message: string): AnyHttpResponse {
  return HttpResponse.json({ message: `Mock API: ${message}` }, { status: 400 });
}

export function paramId(params: PathParams, name = 'id'): string {
  return String(params[name]);
}
