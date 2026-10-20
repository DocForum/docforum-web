import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as consultationService from '../../../services/consultation-service';
import { useAuthStore } from '../../../store/auth-store';
import { consultationKeys } from '../../../query-keys';
import type { ConsultationNote } from '../../../types/models';

const NOTE_KEY = consultationKeys.note;

export function useConsultationNote(appointmentId: string | null) {
  const accessToken = useAuthStore((state) => state.accessToken);
  return useQuery({
    queryKey: NOTE_KEY(appointmentId ?? ''),
    queryFn: ({ signal }) => consultationService.getConsultationNote(appointmentId!, accessToken!, signal),
    enabled: Boolean(accessToken && appointmentId),
  });
}

export function useSignOffNote() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId }: { noteId: string }) =>
      consultationService.signOffNote(noteId, accessToken!),
    onSuccess: (note) => {
      queryClient.setQueryData(NOTE_KEY(note.appointmentId), note);
    },
  });
}

export function useAddAddendum() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      noteId,
      content,
    }: { noteId: string; appointmentId: string; content: string }) =>
      consultationService.addAddendum(noteId, { content }, accessToken!),
    onSuccess: (addendum, variables) => {
      queryClient.setQueryData<ConsultationNote | undefined>(
        NOTE_KEY(variables.appointmentId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            addenda: [...old.addenda, addendum],
          };
        },
      );
    },
  });
}
