Account deletion now calls docforum-core's real `DELETE /patients/me`
(body `{password}`, `204 No Content`) instead of the assumed
`POST /account/delete` ([issue #260](https://github.com/DocForum/docforum-web/issues/260)).
A wrong password (`403 PASSWORD_CONFIRMATION_FAILED`) is shown on the
password field, the typed `DELETE` phrase stays a client-side check, and a
double submit sends one request. Guardians may delete their account: core
revokes guardianships and keeps dependents' profiles and appointments.
