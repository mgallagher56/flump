# Flump brand book

`BRAND-BOOK.html` is a self-contained visual and verbal reference for Flump. It reads all colour, typography, spacing, radius, elevation, motion, logo and document card values directly from `packages/tokens/src`, `packages/ui/src/primitives/FlumpLogo/FlumpLogo.art.ts` and `packages/ui/src/primitives/Illustration/Illustration.documents.ts`.

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
