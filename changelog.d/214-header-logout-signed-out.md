Header no longer offers a logout control to signed-out visitors. The
desktop account chip and Log out button now require both a user and an
access token, so a half-restored session during boot cannot flash the
control before the session settles. Regression tests cover signed-out,
signed-in and partially restored states.

Closes [#214](https://github.com/DocForum/docforum-web/issues/214).
