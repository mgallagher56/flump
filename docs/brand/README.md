# Flump brand book

`BRAND-BOOK.html` is a self-contained showcase of Flump's visual and verbal identity written for an outside reader, such as a potential investor or a new external designer, followed by a compact Reference appendix of design tokens.

It reads all colour, typography, spacing, radius, elevation, motion, logo, illustration and document card values directly from `packages/tokens/src`, `packages/ui/src/primitives/FlumpLogo/FlumpLogo.art.ts`, `packages/ui/src/primitives/Illustration/Illustration.documents.ts` and `packages/ui/src/primitives/Illustration/Illustration.scenes.tsx`.

## Page controls

- **Colour theme (`System`, `Light`, `Dark`)**: switches between Mint (light), Midnight (dark) or the device setting without reloading, updating themed diagrams and pictures across the page.
- **Reduce motion**: sets `data-motion="reduce"` on the page root for readers who prefer stillness.
- Both choices are saved in browser storage when available and degrade cleanly with scripts turned off, falling back to the device theme.

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
```
