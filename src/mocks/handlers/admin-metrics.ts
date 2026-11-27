import { http } from 'msw';
import { badRequest, respond } from '../helpers';

export const adminMetricsHandlers = [
  http.get(
    '*/admin/metrics',
    respond('json', ({ request }) => {
      const url = new URL(request.url);
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      if (!from || !to || Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to))) {
        return badRequest('A valid from and to range is required.');
      }

      return {
        window: { from: new Date(from).toISOString(), to: new Date(to).toISOString(), timeZone: 'UTC' },
        minimumCellCount: 5,
        metrics: {
          noShowRate: { status: 'available', value: 0.073, numerator: 4, denominator: 55 },
          bookingLeadTimeDays: { status: 'available', value: 3.2, unit: 'days', denominator: 55 },
          timeFromSymptomToOrder: { status: 'not_yet_available', value: null },
          referralCompletionRate: { status: 'not_yet_available', value: null },
          ordersFulfilledWithinNDays: { status: 'not_yet_available', value: null },
        },
      };
    }),
  ),
];
