Phase W7: GitHub Pages path-style links now redirect to the matching hash route
through a CSP-compliant 404 fallback ([issue #305](https://github.com/DocForum/docforum-web/issues/305)).
The Pages service worker lets these requests reach the fallback, while hash-route
loads continue to use the cached app shell.
