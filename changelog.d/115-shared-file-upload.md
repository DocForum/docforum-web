Added a shared `Upload` control for intake, lab results, facility
fulfillment and messaging. It supports drag-and-drop, a keyboard picker,
mobile camera capture, signature-based image/PDF validation, image
downscaling, per-file progress, cancel and retry, with file contents kept in
component-local state. `apiUpload` adds an XHR transport to the service layer
for upload progress; endpoint shapes remain documented assumptions.

Closes [#115](https://github.com/DocForum/docforum-web/issues/115).
