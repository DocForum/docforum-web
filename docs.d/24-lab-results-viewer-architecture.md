---
file: ARCHITECTURE_ESSENTIALS.md
section: Known assumptions
---
### Patient lab results (issue #24, assumed docforum-core#72)

docforum-core#72 (abnormal lab result escalation and doctor acknowledgement tracking) has not landed, so every read is assumed:

- `GET /patients/me/lab-results` → `LabResultSummary[]` = `{id, orderId, testName, facilityName, resultedAt, status, flag, summary, requiresDoctorReview}`. `status` is `pending | held | available | reviewed`; `flag` is `normal | abnormal | critical`.
- `GET /lab-results/:id` → `LabResultDetail` adds `{patientProfileId, doctorName, orderedAt, values, acknowledgement, file}`. `values` are `{name, value, unit, referenceRange, flag}`; `acknowledgement` is `{status: not_required | pending | acknowledged, acknowledgedAt?, acknowledgedBy?, nextStep?}`; `file` is `{kind: pdf | image, fileName, mimeType, sizeBytes, contentPath}` or null.
- `GET` the file's own `contentPath` → the file bytes (blob).

The frontend never classifies a result: it renders the backend's `flag` and `status`. A `pending` or `held` result has no readable file, and a held result's values are hidden too, even if the API sends them. Files are fetched through `api-client.ts` with the bearer token and turned into an object URL (revoked when the viewer closes); the report is never embedded from a third-party host. `nextStep` copy is backend-supplied and rendered as text.
