Fixed the footer's "Privacy & analytics" link: it pointed at `/privacy`, which
became the public privacy page in #176, and was a raw `href`, so on GitHub
Pages it left the app's base path. It is now a router link to
`/privacy/analytics`, with a regression test.
