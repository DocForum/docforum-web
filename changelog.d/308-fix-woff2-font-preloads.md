Fix the font preloads in `index.html` after the switch to subsetted WOFF2
fonts ([issue #308](https://github.com/DocForum/docforum-web/issues/308)): the
above-the-fold faces (IBM Plex Sans 400 and Fraunces 600) are preloaded as
`.woff2`, replacing the removed `.ttf` URLs that returned 404 on GitHub Pages
and failed the post-deploy smoke check.
