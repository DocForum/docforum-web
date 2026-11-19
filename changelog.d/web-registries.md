Split the three files nearly every feature PR edited, so PRs stop conflicting
on them: `src/types/models.ts` is now a barrel over `src/types/models/<feature>.ts`
(one file per former section; imports from `types/models` are unchanged),
routes moved from `App.tsx` to `src/routes/<area>.tsx`, and nav entries from
`Layout.tsx` to `src/navigation/<role>.ts`. No route, nav entry or type changed.
