Phase W7: mutation feedback framework — toasts, optimistic updates and undo
([issue #113](https://github.com/DocForum/docforum-web/issues/113)). An
accessible toast region (`src/components/Toast.tsx`, two permanent live
regions, never moves focus, dismiss/Escape, auto-timeout paused on hover or
focus), `useOptimisticMutation` (apply → rollback + error toast → invalidate)
and `useUndoableAction` (delayed commit with an Undo toast; commits instead of
dropping on unmount/pagehide). Applied to the notification inbox: mark-one is
optimistic with rollback, mark-all-read is undoable. Money movement is never
optimistic — `src/hooks/optimistic-policy.test.ts` fails CI if the helpers or
an `onMutate` appear in payments, fulfilment or dispute code.
