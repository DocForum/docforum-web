Fixed the blank home page hero on GitHub Pages. The production CSS minifier
rewrites motion duration tokens such as `100ms` as `.1s`, and
`motionDuration()` (`src/hooks/useMotion.ts`) rejected the leading dot, so the
hero animation threw after hiding its targets and left the headline, subtitle
and call-to-action at opacity 0 (since #189). The parser now accepts the
minified form, and `useMotion` fails open: if an animation setup throws, it
reverts the GSAP context so the content is shown without animation.
