import { apiFetch } from './api-client';
import type { DoctorPracticeInsights } from '../types/models';

export interface GetInsightsParams {
  preset?: string;
  startDate?: string;
  endDate?: string;
}

export function getDoctorPracticeInsights(
  accessToken: string,
  params?: GetInsightsParams,
): Promise<DoctorPracticeInsights> {
  const query = new URLSearchParams();
  if (params?.preset) query.set('preset', params.preset);
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);

  const qs = query.toString();
  const endpoint = `/doctor/insights${qs ? `?${qs}` : ''}`;
  return apiFetch<DoctorPracticeInsights>(endpoint, { accessToken });
}
