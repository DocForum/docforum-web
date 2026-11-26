Phase W7: serve the self-hosted fonts as subsetted WOFF2
([issue #308](https://github.com/DocForum/docforum-web/issues/308)).
The seven Fraunces and IBM Plex Sans faces were subset to Latin plus Latin
Extended for Spanish and converted to WOFF2: 1,035,864 bytes of TTF down to
198,064 bytes of WOFF2 (81% smaller), with the original TTFs retained under
`fonts-source/` and both OFL licences shipped in `public/fonts/`. `fonts.css`
uses `woff2`/`font-display: swap`/`unicode-range`, the stylesheet SRI hash was
recomputed, and IBM Plex Sans 400 is preloaded for above-the-fold text. The
PWA precache already matches `woff2`, so the installed app now renders the
same fonts offline.
