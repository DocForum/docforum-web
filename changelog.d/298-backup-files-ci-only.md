Backup and merge-artefact files (`*.bak`, `*.orig`, `*.rej`) are now caught only by CI's
`npm run check:no-backups` step, not by the malware scanner
([issue #298](https://github.com/DocForum/docforum-web/issues/298)). A leftover
`.orig` from resolving a conflict is a fixable mistake, not malware: the
scanner rule blocked the required `Malware scan` check, stopped CI from being
auto-approved, and skipped scanning the file's contents. The CI step still
fails the `Frontend` job with instructions to delete the file.
