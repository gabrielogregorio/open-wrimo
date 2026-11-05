# Accessibility

Open Wrimo aims at WCAG 2.1 AA.

## What is checked on every pull request

- **axe** runs in Playwright on the home, sign in, sign up with errors, empty shelf, book page with a bookmark and
  full shelf (`e2e/accessibility.spec.ts`).
- **Lighthouse** must score at least 95 in accessibility on the home and sign in pages (`scripts/lighthouse.mts`).
- **eslint-plugin-jsx-a11y** in the recommended preset, plus `react/button-has-type`.
- Component tests find elements by role and label, so a field without a label fails them.

## How the interface is built

- A "Skip to content" link, then `header`, `nav`, `main` and `footer` landmarks; the shelf is a labelled region.
- Every field has a visible label; hints and errors are linked with `aria-describedby` and marked `aria-invalid`.
- Form errors appear in a `role="alert"` box, and a saved reading page is announced in a `role="status"` line.
- Progress is a `progressbar` with its percent; book spines are links whose name is the title and the author.
- Removing a book asks for a confirmation in place, with a "Keep it" way back.
- Focus is always visible with a 3px blue outline that stands out on the paper.
- The `lang` of the page follows the chosen language, English or Brazilian Portuguese.
- With `prefers-reduced-motion` every animation turns off: page turns, the opening cover, the crumpled sheet on
  cancel, lines being drawn and the hover lift on the spines. Cancel then leaves at once.
- The loading screen is a `role="status"` line, so the wait is announced.

## Theme

- Every page uses the paper theme, with `color-scheme: light`, even when the system prefers dark.

## Known gaps

- No manual pass with NVDA or Orca has been recorded yet.
- The spines show titles in vertical text; very long titles are cut on the spine but read in full by screen readers
  and shown in full on the book page.

## Reporting a barrier

Open an issue with the page, the assistive technology and what blocked you.
