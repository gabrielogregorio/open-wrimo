# Accessibility

Open Wrimo aims at WCAG 2.1 AA.

## What is checked on every pull request

- **axe** runs in Playwright on the home, sign in, sign up with errors, the writing desk, a novel, the update page,
  stats, the profile and the community page (`e2e/accessibility.spec.ts`).
- **Lighthouse** must score at least 95 in accessibility on the home and sign in pages (`scripts/lighthouse.mts`).
- **eslint-plugin-jsx-a11y** in the recommended preset, plus `react/button-has-type`.
- Component tests find elements by role and label, so a field without a label fails them.

## How the interface is built

- A "Skip to content" link, then `header`, `nav`, `main` and `footer` landmarks; the page `lang` is `pt-BR`.
- Every field has a visible label; hints and errors are linked with `aria-describedby` and marked `aria-invalid`.
  The word count field keeps a visible thousands mask and sends only digits.
- Form errors appear in a `role="alert"` box; saved progress, achievements and beaten goals are announced in
  `role="status"` regions.
- Goal bars are `progressbar`s with `aria-valuetext` carrying the full percent, even past 100%. Rings and charts are
  figures with a caption, and the chart repeats its numbers in a table for screen readers.
- The cover shelf is a `radiogroup`: arrows, Home and End move between books, and the buttons around it do the same.
- Achievement badges carry their name, description and whether they were earned as text, not only color.
- Every achievement pop-up and celebration can be closed, and the sounds can be muted.
- Deleting a novel, goal or post asks for a confirmation in place, with a way back.
- Focus is always visible with a 3px blue outline that stands out on the paper.
- With `prefers-reduced-motion` every animation turns off: page turns, drawn lines, the 3D tilt of the covers,
  confetti and the shaking alarm clock.

## Known gaps

- No manual pass with NVDA or Orca has been recorded yet.
- The 3D cover follows the pointer only; keyboard users see the same cover at rest.

## Reporting a barrier

Open an issue with the page, the assistive technology and what blocked you.
