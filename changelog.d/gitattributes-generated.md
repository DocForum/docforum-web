The generated API client types (`packages/api-client/src/generated/`) are marked
`linguist-generated` in `.gitattributes`, so GitHub collapses them in PR diffs,
and CI now fails if `npm run generate:api` would change the committed file.
