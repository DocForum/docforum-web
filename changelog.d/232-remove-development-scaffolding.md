Phase W7: removed the development scaffolding that shipped on production
screens ([issue #232](https://github.com/DocForum/docforum-web/issues/232)).
The patient home no longer shows the "Phase W2 · in progress" pill, the
doctor dashboard no longer repeats the signed-in email/role block, and
`/doctor/messages` is now `DoctorMessagesPage` — a real page with a
heading, subtitle and back link — instead of an inline `<div>` in the route
table. Also reworded the admin payments intro and the catalog console
eyebrow, which still carried "Phase W5"/"PHASE W6" labels. The now-unused
`patient.phasePill`, `doctor.signedInAs` and `consultationPlaceholder` CSS
were removed from both catalogues.
