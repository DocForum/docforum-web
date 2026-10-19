import type { Schemas } from '@docforum/api-client';
import { api } from './api-client';

export interface GetInsightsParams {
  preset?: Schemas['DateRangePreset'];
  startDate?: string;
  endDate?: string;
}

export function getDoctorPracticeInsights(
  accessToken: string,
  params?: GetInsightsParams,
): Promise<Schemas['DoctorPracticeInsights']> {
  return api.insights.get(params, { accessToken });
}
