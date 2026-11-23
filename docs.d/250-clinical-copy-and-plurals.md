---
file: ARCHITECTURE_ESSENTIALS.md
section: Privacy and platform guarantees
---
### Localised copy never includes clinical or patient data (issues #248, #250)

Translation covers interface copy only. Medication and test names, doses,
quantities, instructions, facility names, doctor and patient names, audit
action tokens, entity ids and feature-flag keys are rendered exactly as the API
returned them — they are data, not labels. Counts, statuses and role targeting
go through ICU `plural`/`select` messages in the catalogue instead of string
concatenation, so a locale chooses its own plural rules. Every string is
written with an English `defaultMessage` beside its id, so the UI still renders
sensibly before (or without) a locale chunk. Unknown enum values fall back to
the server's token rather than a blank label.
