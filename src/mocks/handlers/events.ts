// Mock SSE stream for `npm run dev:mock` (issue #109). Keeps the shared
// connection manager exercised without a real docforum-core: heartbeats
// prove the parser/reconnect path works, and the stream closes when the
// browser aborts the request.
import { http, HttpResponse } from 'msw';

export const eventHandlers = [
  http.get('*/events', () => {
    const encoder = new TextEncoder();
    let heartbeat: ReturnType<typeof setInterval> | undefined;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(': connected (mock)\n\n'));
        heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': heartbeat (mock)\n\n'));
          } catch {
            if (heartbeat) clearInterval(heartbeat);
          }
        }, 15_000);
      },
      cancel() {
        if (heartbeat) clearInterval(heartbeat);
      },
    });

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
  }),
];
