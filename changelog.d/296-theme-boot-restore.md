Fix: the saved theme is applied on boot again, and the `visual-dark` and
`visual-hc` Playwright projects are back
([issue #296](https://github.com/DocForum/docforum-web/issues/296)). Both were
part of #359 but were lost in merges from `main` before it landed, so a saved
dark or high-contrast choice was forgotten on reload and every screenshot in
the `Visual baselines` workflow failed on `<html data-theme>`.
