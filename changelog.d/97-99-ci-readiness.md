Phase W7: Storybook's CSF catalogue builds cleanly, and patient hub subpages
load their own chunks on demand to keep the home route's Lighthouse blocking
time within budget ([issues #97](https://github.com/DocForum/docforum-web/issues/97)
and [#99](https://github.com/DocForum/docforum-web/issues/99)). The default
appointment-time test now follows the runtime's local time zone instead of
assuming UTC.
