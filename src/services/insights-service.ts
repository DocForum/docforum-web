import type { Schemas } from '@docforum/api-client';
import { api, apiFetch } from './api-client';
import type { FacilityPerformanceInsights } from '../types/models';

export interface GetInsightsParams {
  preset?: Schemas['DateRangePreset'];
  startDate?: string;
  endDate?: string;
}

export function getDoctorPracticeInsights(
  accessToken: string,
  params?: GetInsightsParams,
  signal?: AbortSignal,
): Promise<Schemas['DoctorPracticeInsights']> {
  return api.insights.get(params, { accessToken, signal });
}

export function getFacilityPerformanceInsights(
  accessToken: string,
  facilityId: string,
  params?: GetInsightsParams,
  signal?: AbortSignal,
): Promise<FacilityPerformanceInsights> {
  const query = new URLSearchParams();
  if (params?.preset) query.set('preset', params.preset);
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);

  const qs = query.toString();
  const endpoint = `/facilities/${facilityId}/insights${qs ? `?${qs}` : ''}`;
  return apiFetch<FacilityPerformanceInsights>(endpoint, { accessToken, signal });
}
