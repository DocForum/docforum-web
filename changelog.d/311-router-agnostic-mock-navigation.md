Phase W7: make the mock dev panel's role switch work under both routers
([issue #311](https://github.com/DocForum/docforum-web/issues/311)).
Role homes now come from one shared clean-path map. The dev-only navigation
bridge writes the hash in HashRouter mode and pushes history plus a `popstate`
in BrowserRouter mode; deep links are detected from the hash or the pathname
using the same router flag, including PR preview builds. `check:dist` proves
the bridge never enters a production bundle.
