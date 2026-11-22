import { afterEach, describe, expect, it, vi } from 'vitest';
import { getOrderFulfillmentProgress } from './orders-service';

function respond(body: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getOrderFulfillmentProgress (#262)', () => {
  it('calls the fulfilment-status endpoint with the encoded order id and type', async () => {
    const progress = { totalItems: 3, dispensedItems: 2, status: 'partially_fulfilled' };
    const fetchSpy = respond(progress);

    await expect(
      getOrderFulfillmentProgress('ord rx/1', 'prescription', 'token'),
    ).resolves.toEqual(progress);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toBe(
      'http://localhost:4000/pharmacy-orders/orders/ord%20rx%2F1/fulfillment-status?orderType=prescription',
    );
    expect(init).toMatchObject({
      headers: expect.objectContaining({ Authorization: 'Bearer token' }),
    });
  });

  it('passes lab_order through unchanged', async () => {
    const fetchSpy = respond({ totalItems: 1, dispensedItems: 0, status: 'issued' });

    await getOrderFulfillmentProgress('ord-lab-1', 'lab_order', 'token');

    expect(String(fetchSpy.mock.calls[0][0])).toContain('orderType=lab_order');
  });
});
