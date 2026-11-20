CI: `PR CI auto-approval` also holds PRs whose `Cargo.lock` pulls crates from
outside crates.io or whose `go.mod` adds a `replace` directive, so the
approver script is identical in all three repos.
