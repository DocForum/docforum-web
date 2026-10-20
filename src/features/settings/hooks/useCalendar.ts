import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as calendarService from '../../../services/calendar-service';
import { useAuthStore } from '../../../store/auth-store';
import { calendarKeys } from '../../../query-keys';
import type { CalendarFeedResponse } from '../../../types/models';

const CALENDAR_FEED_KEY = calendarKeys.feed();

export function useCalendarFeed() {
  const accessToken = useAuthStore((state) => state.accessToken);
  return useQuery({
    queryKey: CALENDAR_FEED_KEY,
    queryFn: ({ signal }) => calendarService.getCalendarFeed(accessToken!, signal),
    enabled: Boolean(accessToken),
  });
}

export function useRotateCalendarToken() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);

  return useMutation({
    mutationFn: () => calendarService.rotateCalendarToken(accessToken!),
    onSuccess: (data) => {
      // Update the feed data with new URL
      queryClient.setQueryData<CalendarFeedResponse>(
        CALENDAR_FEED_KEY,
        (old) => (old ? { ...old, icsUrl: data.icsUrl } : undefined)
      );
    },
  });
}
