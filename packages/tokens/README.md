# @flump/tokens

The one authored source of Flump's design tokens, for web, marketing and the mobile app. The design is in [`docs/ux/CROSS-PLATFORM.md`](../../docs/ux/CROSS-PLATFORM.md) section 2.

## What is authored

`src/index.ts`, `typography.ts`, `layout.ts`, `elevation.ts`, `motion.ts` and `breakpoints.ts`: primitive scales, the six semantic colour namespaces with `{ base, _dark }` values, text styles, spacing, radii, sizes, shadows, motion, z-index and the nav breakpoint. Values are plain strings (the plain-values rule in [`docs/design/e15/tokens.md`](../../docs/design/e15/tokens.md)). Edit only these files.

Web and marketing read them through the Panda preset in `packages/ui/panda.preset.ts`; `packages/ui/src/tokens/index.ts` re-exports this package, so `@repo/ui` exports the same names.

## What is generated

`src/native.generated.ts`, exported as `@flump/tokens/native`: the React Native theme. `light` and `dark` (`colors` and `shadows`, typed `ColorKey` and `ShadowKey`, keyed by Panda token paths such as `surface.canvas`), plus `spacing`, `radii`, `sizes`, `fontSizes`, `textStyles`, `durations`, `easings`, `zIndex` and `breakpoints` as numbers. Comfortable density only. It is committed and never edited by hand.

## How to regenerate

```sh
bun run --cwd packages/tokens generate:tokens   # or: bunx turbo run generate:tokens
```

Run it after any token change and commit the file. `src/native.test.ts` fails when the committed file differs from a fresh render. The other checks:

- `src/tokens.a11y.test.ts` and `src/native.test.ts` run the contrast pair matrix in `src/contrast.ts` on the authored and the generated values.
- `packages/ui/src/tokens/tokens.contract.test.ts` compares the generated theme with Panda's own `panda codegen --spec` output.

## How mobile will consume it

```ts
import { dark, light, spacing, textStyles } from "@flump/tokens/native";

const theme = scheme === "dark" ? dark : light;
const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors["surface.card"],
    padding: spacing["4"],
    boxShadow: theme.shadows.card,
  },
});
```

The app's `ThemeProvider` (E12 T2.3) exposes the right object through `useTheme()`. Map `textStyles[*].fontFamily` (`"body"`, `"heading"`, `"mono"`) to the bundled font files; fluid sizes are `{ min, max }` (phone uses the minimum, tablet the maximum).

## Build

`bun run build` writes `dist` (ESM and `.d.ts`), which Node, Vite, Vitest and Metro load. Panda's config loader reads `src` through the `module` export condition, so `panda codegen` works before anything is built. Turbo builds this package before anything that depends on it.
