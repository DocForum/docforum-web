Phase W7: dark and high-contrast visual baselines
([issue #296](https://github.com/DocForum/docforum-web/issues/296)). New
`visual-dark` and `visual-hc` projects capture the same eight screens in the
other themes, and the saved `docforum-theme` choice is applied on boot so the
stylesheet's `data-theme` is what the screenshots (and users) get. The
high-contrast token set lives in `global.css`; the light baselines are
unchanged.
