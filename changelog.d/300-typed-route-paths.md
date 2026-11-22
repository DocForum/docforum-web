Phase W7: route paths now live in one typed table,
`src/routes/paths.ts` ([issue #300](https://github.com/DocForum/docforum-web/issues/300)).
Route definitions, navigation, notification fallbacks, the patient hub and the
doctor dashboard build targets through `paths.*`/`patientSections`, so a renamed
route fails `npm run typecheck`. The unrouted `/doctor/consultation/new` action
now goes to the queue, the duplicate `/patient/orders` routes are gone, and new
hand-written `to="/…"`/`navigate('/…')` literals show up as lint warnings.
