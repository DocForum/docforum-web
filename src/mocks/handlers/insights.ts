// Doctor practice insights endpoint.
import { http } from 'msw';
import { db } from '../db';
import { paramId, respond } from '../helpers';

export const insightsHandlers = [
  http.get(
    '*/doctor/insights',
    respond('json', ({ request }) => {
      const url = new URL(request.url);
      const preset = url.searchParams.get('preset');
      const startDate = url.searchParams.get('startDate');
      const endDate = url.searchParams.get('endDate');
      const { insights } = db;
      if (preset || startDate || endDate) {
        return {
          ...insights,
          range: {
            preset: (preset ?? insights.range.preset) as typeof insights.range.preset,
            startDate: startDate ?? insights.range.startDate,
            endDate: endDate ?? insights.range.endDate,
          },
        };
      }
      return insights;
    }),
  ),

  http.get(
    '*/facilities/:facilityId/insights',
    respond('json', ({ params, request }) => {
      const url = new URL(request.url);
      const preset = url.searchParams.get('preset');
      const startDate = url.searchParams.get('startDate');
      const endDate = url.searchParams.get('endDate');
      const facilityId = paramId(params, 'facilityId');
      const insights = db.facilityInsights;
      const withFacility = { ...insights, facilityId };
      if (preset || startDate || endDate) {
        return {
          ...withFacility,
          range: {
            preset: (preset ?? insights.range.preset) as typeof insights.range.preset,
            startDate: startDate ?? insights.range.startDate,
            endDate: endDate ?? insights.range.endDate,
          },
        };
      }
      return withFacility;
    }),
  ),
];
