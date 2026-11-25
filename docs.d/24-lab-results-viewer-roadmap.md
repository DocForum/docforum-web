---
file: ROADMAP.md
section: Phase W2 — Patient core flow
---
- [x] Lab results viewer with abnormal-value highlighting. Tracked as [issue #24](https://github.com/DocForum/docforum-web/issues/24) (High, 200 pts) — `src/features/results/lab/`, `/patient/results` and `/patient/results/:resultId`. The list shows test, facility, date, status and flag; the detail adds the plain-language summary, a flag explanation, an accessible values table with flagged rows marked, and what happens next for abnormal/critical results (doctor notified, acknowledgement state) instead of alarming raw text. Pending results have no file; held results withhold both values and file until a doctor reviews them, as the backend decides. PDFs and images open in a lazy in-app viewer fetched as an authenticated blob (no third-party viewer, no token in a URL) and can be downloaded. **Built against assumed shapes:** docforum-core#72 hasn't landed — see `ARCHITECTURE_ESSENTIALS.md` "Known assumptions".
