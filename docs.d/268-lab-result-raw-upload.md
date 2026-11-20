---
file: ARCHITECTURE_ESSENTIALS.md
section: Known assumptions
---
### Raw lab result uploads (issue #268)

Lab results are uploaded as raw request bodies to
`POST /orders/lab-orders/:id/result` with `application/pdf`, `image/png`, or
`image/jpeg`. Files are limited to 10 MiB and rejected when content and declared
type differ. Uploads use the shared XHR transport for progress and no automatic
retry. Codes `LAB_RESULT_UNSUPPORTED_TYPE`, `LAB_RESULT_CONTENT_MISMATCH`,
`LAB_RESULT_TOO_LARGE`, `LAB_RESULT_ALREADY_ATTACHED`,
`LAB_ORDER_SUPERSEDED`, and `OBJECT_STORAGE_NOT_CONFIGURED` are shown with
specific recovery copy.
