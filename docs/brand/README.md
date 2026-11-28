# Flump brand book

`BRAND-BOOK.html` is a self-contained editorial showcase of Flump's visual and verbal identity written for an outside reader, such as a potential investor or a new external designer, followed by a collapsed Reference appendix of design tokens.

It reads colour, typography, spacing, radius, elevation, motion, logo, illustration and document card values directly from `packages/tokens/src`, `packages/ui/src/primitives/FlumpLogo/FlumpLogo.art.ts`, `packages/ui/src/primitives/Illustration/Illustration.documents.ts` and `packages/ui/src/primitives/Illustration/Illustration.scenes.tsx`. Interactive controls, cards, badges and area tiles are statically rendered at build time from `packages/ui/src/primitives/` with their generated styles, alongside paired desktop and phone screen captures in `docs/brand/assets/screens/`.

## Page controls

- **Contents drawer**: jump directly to any chapter from the sticky top bar.
- **Colour theme (`System`, `Light`, `Dark`)**: switches between Mint (light), Midnight (dark) or the device setting without reloading, updating themed diagrams, UI specimens and screen captures across the page.
- **Reduce motion**: sets `data-motion="reduce"` on the page root for readers who prefer stillness.
- Both choices are saved in browser storage when available and degrade cleanly with scripts turned off, falling back to the device theme.

## Motion, reduced motion and print

- **Live motion**: approved marketing and app motion specimens play using the exact durations and easings from `packages/tokens/src/motion.ts`, starting once when scrolled into view and offering a `Play again` button. The two home page videos in the evolution chapter play muted in a loop only while in view and when motion is allowed. The three-bubble logo stays still everywhere.
- **Reduced motion**: under `@media (prefers-reduced-motion: reduce)` or `data-motion="reduce"`, all animations jump to their finished state at once, floating orbs and bubbles stand still, hover light stays active without card tilt, and videos stay paused on their poster frame. With scripts turned off, CSS animations play once (or rest finished under reduced motion) and all copy remains readable.
- **Print**: the `@media print` stylesheet forces the Mint (light) theme, settles every animation to its finished state, hides navigation, controls and video elements, shows still poster images instead of videos, avoids awkward page breaks inside cards and diagrams, and styles links plainly.

## Standing rules take precedence

The brand book presents the standing rules and never adds to them. These documents remain the source of truth and win any difference:

- [`docs/ux/STYLE-GUIDE.md`](../ux/STYLE-GUIDE.md)
- [`docs/ux/UX-GUIDELINES.md`](../ux/UX-GUIDELINES.md)
- [`docs/ux/CROSS-PLATFORM.md`](../ux/CROSS-PLATFORM.md)
- [`docs/copy/COPY-GUIDE.md`](../copy/COPY-GUIDE.md)

## Regenerate and test

```sh
bun run brand-book
bun test scripts/brand-book
bun run --cwd apps/e2e e2e:brand-book
```
