---
file: ROADMAP.md
section: Phase W2 — Patient core flow
---
- [x] Doctor profile page with a week-view availability calendar. Tracked as
  [issue #13](https://github.com/DocForum/docforum-web/issues/13) (High,
  200 pts) — `/doctors/:doctorId` (`src/features/doctor-search/`) shows the
  doctor's name, verified specialties and a keyboard-navigable week grid of
  open slots with previous/next-week navigation. Selecting a slot hands off to
  `/patient/book` with that slot preselected. Times render in the patient's
  zone; the doctor's zone is labelled when the API supplies it. Empty weeks
  name the next available time.
