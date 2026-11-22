Phase W7: removed five committed editor backups (`src/App.tsx.bak` among them)
and made CI reject new ones ([issue #298](https://github.com/DocForum/docforum-web/issues/298)).
`*.bak`, `*.orig` and `*.rej` are now ignored, `npm run check:no-backups` runs
in the Frontend job, and the PR malware scan flags such files by name.
