### #242: accessible error summaries for long forms

- Created shared `ErrorSummary` component at `src/components/ErrorSummary.tsx`
- Provides accessible error summary at the top of long forms with:
  - Clearly titled, focusable summary region (`role="alert"`, `tabIndex={0}`)
  - Links to invalid field IDs for screen-reader navigation
  - Focus moves to summary after failed submission
  - Summary updates as validation errors are corrected
  - Handles server-side errors from `mapServerErrors`
  - Deduplicates field IDs
- Adopted in three long forms:
  - `FacilitySettingsView` (`idPrefix="facility"`)
  - `GenerateSlotsForm` (`idPrefix="generate-slots"`)
  - `ConsultationOutcomePanel` (`idPrefix="consultation-outcome"`)
- Short forms (Login, Signup) retain existing focus-first-invalid-field behavior
- Axe accessibility checks included in tests