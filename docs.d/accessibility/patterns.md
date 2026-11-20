# Accessibility Patterns

## Error Summary for Long Forms

### When to use an error summary versus focusing the first invalid field

Use an error summary for **long forms** (typically forms spanning multiple screenfuls or requiring significant scrolling). Error summaries provide a centralized place for users to identify all errors at once and navigate directly to the affected fields.

For **short forms** (Login, Signup, and other compact forms), retain the existing focus-on-first-invalid-field behavior. The error summary should not be used as a global replacement for this pattern.

### How long forms should integrate `ErrorSummary`

1. Import the `ErrorSummary` component from `src/components/ErrorSummary`
2. Pass the form's validation errors using the `errors` prop (`Record<string, { message: string }>`)
3. Optionally provide an `idPrefix` for nested form structures (e.g., `"facility"`, `"generate-slots"`, `"consultation-outcome"`)
4. The summary renders:
   - A heading showing the count of errors found
   - A list of links, each pointing to the corresponding field ID (`#field-id`)
   - Links are unique (duplicate IDs are deduplicated, keeping the first occurrence)
   - The summary is focusable (`tabIndex={0}`, `role="alert"`, `aria-live="polite"`)
   - Focus moves to the summary after a failed submission (when there are errors)
   - The summary updates reactively as errors are corrected

### How field IDs and summary links must remain synchronized

- Field IDs are generated from field names using `generateFieldId(fieldName, idPrefix)`
- The ID conversion follows kebab-case: camelCase/PascalCase fields become `-separated` IDs
- Summary links use `href="#{fieldId}"` to target the field
- Ensure form field `id` attributes match the IDs generated for summary links
- The `idPrefix` must be consistent between the form structure and the ErrorSummary component

### How server-side errors are included

- Server-side errors produced by `mapServerErrors` should be formatted as `{ fieldName: { message: string } }`
- These errors are passed to the `ErrorSummary` component just like client-side validation errors
- The summary will automatically include server-side errors in its list
- Ensure the error object keys match the form field names

### How to implement the shared password field

See the PasswordField section below.

### Keyboard, screen-reader, focus, Caps Lock, and password-manager considerations

- **Error summary**: Keyboard users can tab to the summary (it has `tabIndex={0}`), and screen-reader users hear the error count and list of links. Each link has `aria-describedby` pointing to the corresponding field's error message ID.
- **Password field show/hide toggle**: 
  - Toggle button has `aria-pressed` attribute reflecting visibility state
  - Toggle has an accessible name via `aria-label` ("Show password"/"Hide password")
  - Keyboard operation supported (Space/Enter to toggle)
  - Interactive target meets 24px minimum
  - Password returns to masked state on form submission
  - Password manager behavior preserved (autocomplete values like `current-password`, `new-password` are maintained)
- **Caps Lock hint**:
  - Detected via `event.getModifierState('CapsLock')` from keyboard events
  - Hint is associated with the input via `aria-describedby`
  - Hint announces politely: "Caps Lock is on. Consider turning it off."
  - Hint appears when the field has focus AND Caps Lock is active
  - Hint disappears when Caps Lock is inactive or the field loses focus
  - No excessive repeated announcements (state is tracked via React state)