- Dependents: the add form now sends only `fullName` and `dateOfBirth` to
  docforum-core's strict `POST /patients/me/dependents`, validates the age of
  majority (18 by default) before submitting, and shows
  `DEPENDENT_NOT_A_MINOR` on the date-of-birth field. Acting-for health
  screens now explain `GUARDIANSHIP_INACTIVE` as the end of the guardianship
  handover instead of surfacing a raw 403.
