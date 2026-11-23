Phase W3: open the patient chart and the consultation straight from today's
appointments ([issue #312](https://github.com/DocForum/docforum-web/issues/312)).
Each expanded `TodayAppointments` row now offers "Open chart" and "Open
consultation" links (with per-patient accessible names); cancelled and no-show
rows explain why there is no consultation instead of linking to one. The live
queue's chart button now says whose chart it opens ("Open chart for Ada
Patient") and its label is translated.

The chart's 403 state now explains the care-relationship restriction (issue
#43) rather than showing the generic access-denied copy. The assumed
`Appointment` shape already carries `patientProfileId`, so no API-shape or
fixture change was needed.
