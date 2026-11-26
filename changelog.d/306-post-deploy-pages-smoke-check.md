Phase W7: smoke-check the published Pages site after every deploy
([issue #306](https://github.com/DocForum/docforum-web/issues/306)).
`scripts/check-deployed-site.mjs` runs as a post-deploy job, retries briefly for
CDN propagation, parses the live `index.html`, fetches every referenced script,
stylesheet, font preload, `manifest.webmanifest` and `sw.js`, asserts 200 and
the expected content type, and writes a PASS/FAIL table to the workflow summary.
No backend endpoints are called.
