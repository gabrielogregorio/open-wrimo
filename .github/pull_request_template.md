## What changes

<!-- one or two lines: what the reader notices -->

## Changelog

[...autoGenerate]

## Checklist

- [ ] Release? The branch is `release/X.Y.Z` and `package.json` says the same (no other PR needs a version)
- [ ] All checks pass, with coverage still at 100%
- [ ] New UI text is English inside `t('…')` with its line in `src/lib/i18n/pt-BR.ts`
- [ ] New behavior has tests in the same PR
- [ ] Every query that touches a book filters by the signed-in reader
- [ ] Checked at 320px, 375px, 768px, 1280x720 and 1440px
- [ ] Docs updated when a command, a route, an environment variable or a setting changed
