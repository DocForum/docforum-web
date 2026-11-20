Phase W7: the installed PWA follows the device orientation (WCAG 1.3.4,
[issue #240](https://github.com/DocForum/docforum-web/issues/240)). The
manifest no longer locks to portrait; below 900px (which covers a 740x360
landscape mount) the compact drawer navigation is used, short viewports get
tighter header/page-header spacing, and a new Playwright landscape project
checks login, patient home, the doctor queue and facility verify for
horizontal overflow.
