Phase W2: patient lab results list and detail viewer
([issue #24](https://github.com/DocForum/docforum-web/issues/24)). New
`/patient/results` and `/patient/results/:resultId` screens show the
backend's flag (normal, abnormal, critical), explain what a flagged result
means and what happens next, and withhold held results until a doctor
reviews them. PDFs and images open in a lazy in-app viewer fetched as an
authenticated blob, with download. Assumed shapes pending docforum-core#72.
