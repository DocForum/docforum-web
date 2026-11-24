### Admin accessibility and keyboard tests (#247)

Six admin consoles — audit trail, disputes, feature flags, stuck referrals,
system health and doctor verification — now have `*.a11y.test.tsx` suites that
run axe over the rendered page and check the labelling patterns they rely on
(tabs, switches, filter groups, review links). The four destructive dialogs
(`ResolutionDialog`, `FlagChangeDialog`, `ReassignDialog`, `DecisionDialog`)
have keyboard suites covering focus entering the dialog, Tab staying inside
the modal, Escape closing it and focus returning to the control that opened
it. The suites found and fixed a real defect: the resolution and verification
dialogs captured the opener after `autoFocus` had already moved focus, so
closing them dropped focus onto `<body>`. `e2e/axe-allowlist.json` stays empty
and the new admin routes are in `e2e/routes.ts`.
