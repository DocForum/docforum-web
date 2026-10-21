import { apiFetch } from './api-client';
import type {
  DoctorPracticeInsights,
  FacilityPerformanceInsights,
} from '../types/models';

export interface GetInsightsParams {
  preset?: string;
  startDate?: string;
  endDate?: string;
}

export function getDoctorPracticeInsights(
  accessToken: string,
  params?: GetInsightsParams,
  signal?: AbortSignal,
): Promise<DoctorPracticeInsights> {
  const query = new URLSearchParams();
  if (params?.preset) query.set('preset', params.preset);
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);

  const qs = query.toString();
  const endpoint = `/doctor/insights${qs ? `?${qs}` : ''}`;
  return apiFetch<DoctorPracticeInsights>(endpoint, { accessToken, signal });
}

export function getFacilityPerformanceInsights(
  accessToken: string,
  facilityId: string,
  params?: GetInsightsParams,
): Promise<FacilityPerformanceInsights> {
  const query = new URLSearchParams();
  if (params?.preset) query.set('preset', params.preset);
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);

  const qs = query.toString();
  const endpoint = `/facilities/${facilityId}/insights${qs ? `?${qs}` : ''}`;
  return apiFetch<FacilityPerformanceInsights>(endpoint, { accessToken });
}
