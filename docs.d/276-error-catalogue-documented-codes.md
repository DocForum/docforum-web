---
file: ARCHITECTURE_ESSENTIALS.md
section: Known assumptions
---
### Phase W7 — Error catalogue documented codes (issue #276)

`src/services/error-catalogue.ts` maps all error codes documented in `docforum-core`'s `docs/api/README.md` (including `EMAIL_NOT_VERIFIED`, `FEATURE_DISABLED`, `GUARDIANSHIP_INACTIVE`, `DEPENDENT_NOT_A_MINOR`, `EXPORT_NOT_READY`, `EXPORT_EXPIRED`, `LAB_RESULT_*`, `REFERRAL_NO_ELIGIBLE_TARGET`, `WALLET_NOT_LINKED`, `FACILITY_WALLET_NOT_LINKED`, `PAYEE_TRUSTLINE_MISSING`, `INVALID_CURSOR`, `OBJECT_STORAGE_NOT_CONFIGURED`, and others) to localized user-facing copy and recovery actions.
