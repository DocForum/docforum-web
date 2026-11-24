import { apiFetch } from './api-client';
import type { CalendarFeedResponse, RotateTokenResponse } from '../types/models';

export function getCalendarFeed(accessToken: string, signal?: AbortSignal): Promise<CalendarFeedResponse> {
  return apiFetch<CalendarFeedResponse>('/doctor/calendar/feed', { accessToken, signal });
}

export function rotateCalendarToken(accessToken: string): Promise<RotateTokenResponse> {
  return apiFetch<RotateTokenResponse>('/doctor/calendar/rotate', {
    method: 'POST',
    accessToken,
  });
}
