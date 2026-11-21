---
file: ARCHITECTURE_ESSENTIALS.md
section: Phase W7 — Platform quality (issues #116–#119)
---
#### Mutation feedback: toasts, optimistic updates, undo (issue #113)
- `ToastRegion` is mounted once in `App.tsx`; call `showToast({ message, tone, action?, durationMs? })` from anywhere (`src/store/toast-store.ts`). Messages are short, already-translated UI copy, never server records or PHI. Errors go to the assertive region, everything else to the polite one; toasts never take focus.
- A toast is never the only place a **form** error appears — show it next to the form (`FormError`/field errors). Toasts are for background results.
- `useOptimisticMutation` qualifies only for reversible UI state the server will almost always accept: read/unread, toggles, reordering, dismissing. `useUndoableAction` (delayed commit) is for easily mis-clicked reversible actions with no compensating API call.
- **Never** optimistic or delayed for money movement or escrow: payment intents, wallet payments, payouts, refunds, dispute resolutions. Also not for server-validated form submissions (booking, sign-up). `src/hooks/optimistic-policy.test.ts` scans `src/features/payments/`, `src/features/fulfillment/`, `src/features/admin-disputes/` and `src/services/payments-service.ts` and fails CI on any optimistic helper or `onMutate`.
- Current users: notification mark-one-read (optimistic + rollback toast) and mark-all-read (undoable, committed on unmount/pagehide rather than dropped; other tabs are told on commit).
