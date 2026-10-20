import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Closure, CreateClosureInput, UpdateClosureInput } from '../../../types/models';
import type { AffectedAppointment } from '../../../types/models';

/** Query keys for closures */
export const CLOSES_KEY = ['admin', 'closures'] as const;
export const AFFECTED_APPOINTMENTS_KEY = ['admin', 'closures', 'affected-appointments'] as const;

/** Get all closures (platform-wide or facility-scoped) */
export function useClosures(facilityId?: string) {
  return useQuery<Closure[]>({
    queryKey: [...CLOSES_KEY, facilityId],
    queryFn: () => {
      // If facilityId is provided, filter by it; otherwise list all
      return fetch(`/admin/closures${facilityId ? `?facilityId=${facilityId}` : ''}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        credentials: 'include',
      }).then(res => {
        if (!res.ok) throw new Error('Failed to fetch closures');
        return res.json();
      });
    },
    enabled: !!localStorage.getItem('accessToken'),
  });
}

/** Get affected booked appointments for a closure */
export function useAffectedAppointments(closureId: string) {
  return useQuery<AffectedAppointment[]>({
    queryKey: [...AFFECTED_APPOINTMENTS_KEY, closureId],
    queryFn: () => fetch(`/admin/closures/${closureId}/affected-appointments`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      credentials: 'include',
    }).then(res => {
      if (!res.ok) throw new Error('Failed to fetch affected appointments');
      return res.json();
    }),
    enabled: !!closureId && !!localStorage.getItem('accessToken'),
  });
}

/** Create a new closure */
export function useCreateClosure() {
  const queryClient = useQueryClient();

  return useMutation<Closure, Error, CreateClosureInput>({
    mutationFn: (input: CreateClosureInput) =>
      fetch('/admin/closures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        credentials: 'include',
        body: JSON.stringify(input),
      }).then(res => {
        if (!res.ok) throw new Error('Failed to create closure');
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLOSES_KEY });
    },
  });
}

/** Update a closure */
export function useUpdateClosure() {
  const queryClient = useQueryClient();

  return useMutation<Closure, Error, { id: string; input: UpdateClosureInput }>({
    mutationFn: ({ id, input }) =>
      fetch(`/admin/closures/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        credentials: 'include',
        body: JSON.stringify(input),
      }).then(res => {
        if (!res.ok) throw new Error('Failed to update closure');
        return res.json();
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [...CLOSES_KEY, id] });
    },
  });
}

/** Delete a closure */
export function useDeleteClosure() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id: string) =>
      fetch(`/admin/closures/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        credentials: 'include',
      }).then(res => {
        if (!res.ok) throw new Error('Failed to delete closure');
      }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [...CLOSES_KEY, id] });
    },
  });
}