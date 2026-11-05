# Contributing

1. Set the project up as the [README](README.md#set-up-on-a-new-pc) explains.
2. Work on a branch from `dev` and open the pull request into `main`.
3. Before pushing, run `pnpm run format:check`, `pnpm run lint` and `pnpm run unit:coverage`. Run `pnpm run e2e`
   when a page, a form or a route changed.
4. Keep coverage at 100%: write the test that would catch the bug, not one that only runs the line.
5. New interface text is English inside `t('…')`, with its line in `src/lib/i18n/pt-BR.ts`.

## Releasing

Only a `release/X.Y.Z` branch publishes. Create it from `dev`, set the same version in `package.json`, add the notes
to `CHANGELOG.md` and open the pull request into `main`. Merging it creates the tag and the release. Every other pull
request merges without a version.
