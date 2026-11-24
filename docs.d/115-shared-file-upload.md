---
file: ARCHITECTURE_ESSENTIALS.md
section: Known assumptions — platform and API client
---

# Shared file upload

`src/components/Upload.tsx` is the shared upload control for intake forms,
lab results, facility fulfillment and messaging. It supports drag-and-drop
and a keyboard-operable picker, an optional mobile camera input
(`capture="environment"`), per-file progress, cancel and retry.

File state stays local to the component. Nothing is written to Zustand,
localStorage or sessionStorage, and no object URL is created.

## Validation and image handling

`src/components/upload-utils.ts` reads the file signature rather than
trusting `File.type`, so a renamed non-image cannot pass as an image. PNG,
JPEG, GIF, WebP, HEIC, PDF and ZIP signatures are recognised. Defaults are a
10 MB limit and `image/*,application/pdf`; callers can override `accept`,
`maxSizeBytes`, `imageMaxDimension` and `imageQuality`.

Images whose longest side exceeds `imageMaxDimension` (2048 by default) are
downscaled through `createImageBitmap` and canvas before upload. If the
browser lacks that pipeline, the original file is sent unchanged.

## Transport and assumed API shape

`src/services/api-client.ts` exposes `apiUpload`, an XHR transport used only
because `fetch` cannot report upload progress. It sends credentials like
`apiFetch`, adds the bearer token when supplied, and uses the same
`{ message }` error envelope.

The component's default transport posts `multipart/form-data` to the
caller-supplied `endpoint`, with the file under `fieldName` (`file` by
default). The endpoint is assumed until `docforum-core` ships real upload
routes; the successful JSON response is passed to `onUploaded`. Tests and
custom flows can inject `uploadFile` instead of a live endpoint.

## Storybook

`Upload.stories.tsx` is dependency-free CSF so it can be adopted when
Storybook lands in issue #97 without adding Storybook to this change.

Closes [#115](https://github.com/DocForum/docforum-web/issues/115).
