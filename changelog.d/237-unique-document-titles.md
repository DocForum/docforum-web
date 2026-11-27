Phase W7: every route now names its own tab, so screen-reader and keyboard
users can tell open tabs apart (WCAG 2.4.2 Page Titled). Closes issue #237.

`src/hooks/useDocumentTitle.ts` titles each route `<page> · DocForum`, reading
the label from the route metadata in `src/navigation/breadcrumbs.ts` so record
screens stay generic ("Order details", never a patient or medication) and a
language change retitles the tab. `Layout` applies it to every app route,
including the nested patient routes; the prerendered public pages keep their
own `usePageMeta` metadata and are left alone. Analytics page views still send
the URL only, never the title.

The metadata table gained labels for routes that had none (`patient/book`,
`patient/appointments`, `patient/referrals`, `patient/waitlist`,
`patient/doctors`, `patient/appointments/:id/intake`, `doctors/:doctorId`,
`doctor/verification`, `invite`, `privacy/analytics`, `patient/results`,
`patient/results/:resultId`, `admin/users`, `admin/payments/console`), and
`/patient/care` is now "Care timeline" so it is not confused with `/care`.
`e2e/accessibility.spec.ts` asserts every route in `e2e/routes.ts` — now
including the lab-results and admin routes — has a non-empty, product-named
title that carries no fixture patient data and that no other route shares.
