import type { ColorKey, ShadowKey } from "../../packages/tokens/src/native.generated";
import { type BrandTokens, colorVar, shadowVar, toCssIdent } from "./tokens";
import { getUiSpecimensCss } from "./uiSpecimens";

function renderThemeVars(
  mode: "light" | "dark",
  colors: Readonly<Record<ColorKey, string>>,
  shadows: Readonly<Record<ShadowKey, string>>,
  logoOpacity: { backing: number; core: number; mid: number; sheen: number; glint: number },
): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(colors)) {
    lines.push(`  --color-${toCssIdent(key)}: ${value};`);
  }
  for (const [key, value] of Object.entries(shadows)) {
    lines.push(`  --shadow-${toCssIdent(key)}: ${value};`);
  }
  lines.push(`  --logo-op-backing: ${logoOpacity.backing};`);
  lines.push(`  --logo-op-core: ${logoOpacity.core};`);
  lines.push(`  --logo-op-mid: ${logoOpacity.mid};`);
  lines.push(`  --logo-op-sheen: ${logoOpacity.sheen};`);
  lines.push(`  --logo-op-glint: ${logoOpacity.glint};`);
  lines.push(`  --logo-floor-light-display: ${mode === "light" ? "inline" : "none"};`);
  lines.push(`  --logo-floor-dark-display: ${mode === "dark" ? "inline" : "none"};`);
  lines.push(`  --show-on-light: ${mode === "light" ? "block" : "none"};`);
  lines.push(`  --show-on-dark: ${mode === "dark" ? "block" : "none"};`);
  lines.push(
    `  --scene-ground: ${mode === "light" ? colors["surface.sunken"] : colors["surface.subtle"]};`,
  );
  lines.push(`  --scene-apricot-op: ${mode === "light" ? "0.5" : "0.3"};`);
  lines.push(`  --doc-shadow-op: ${mode === "light" ? "0.14" : "0.6"};`);
  lines.push(
    `  --orb-light: ${mode === "light" ? colors["surface.card"] : colors["text.onContrast"]};`,
  );
  return lines.join("\n");
}

function renderStaticVars(tokens: BrandTokens): string {
  const lines: string[] = [];
  const { native, authored } = tokens;

  for (const [key, value] of Object.entries(native.spacing)) {
    lines.push(`  --space-${toCssIdent(key)}: ${value}px;`);
  }
  for (const [key, value] of Object.entries(native.radii)) {
    lines.push(`  --radius-${toCssIdent(key)}: ${value}px;`);
  }
  for (const [key, value] of Object.entries(native.sizes)) {
    lines.push(`  --size-${toCssIdent(key)}: ${value}px;`);
  }
  for (const [key, value] of Object.entries(authored.primitiveFontSizes)) {
    lines.push(`  --font-size-${toCssIdent(key)}: ${value.value};`);
  }
  for (const [key, value] of Object.entries(authored.primitiveDurations)) {
    lines.push(`  --duration-${toCssIdent(key)}: ${value.value};`);
  }
  for (const [key, value] of Object.entries(authored.primitiveEasings)) {
    lines.push(`  --easing-${toCssIdent(key)}: ${value.value};`);
  }
  for (const [key, value] of Object.entries(authored.marketingDurations)) {
    lines.push(`  --duration-marketing-${toCssIdent(key)}: ${value.value};`);
  }
  for (const [key, value] of Object.entries(authored.marketingEasings)) {
    lines.push(`  --easing-marketing-${toCssIdent(key)}: ${value.value};`);
  }
  for (const [key, value] of Object.entries(native.zIndex)) {
    lines.push(`  --z-${toCssIdent(key)}: ${value};`);
  }

  lines.push(`  --font-heading: ${authored.fontFamilies.heading};`);
  lines.push(`  --font-body: ${authored.fontFamilies.body};`);
  lines.push(`  --font-mono: ${authored.fontFamilies.mono};`);
  lines.push(`  --weight-regular: ${authored.fontWeights.regular.value};`);
  lines.push(`  --weight-medium: ${authored.fontWeights.medium.value};`);
  lines.push(`  --weight-semibold: ${authored.fontWeights.semibold.value};`);
  lines.push(`  --weight-bold: ${authored.fontWeights.bold.value};`);

  lines.push(`  --text-display-size: ${authored.webTextStyles.display.value.fontSize};`);
  lines.push(`  --text-display-lh: ${authored.webTextStyles.display.value.lineHeight};`);
  lines.push(`  --text-display-ls: ${authored.webTextStyles.display.value.letterSpacing};`);
  lines.push(`  --text-display-ws: ${authored.webTextStyles.display.value.wordSpacing};`);

  lines.push(`  --text-heading-xl-size: ${authored.webTextStyles.heading.xl.value.fontSize};`);
  lines.push(`  --text-heading-xl-lh: ${authored.webTextStyles.heading.xl.value.lineHeight};`);
  lines.push(`  --text-heading-xl-ls: ${authored.webTextStyles.heading.xl.value.letterSpacing};`);
  lines.push(`  --text-heading-xl-ws: ${authored.webTextStyles.heading.xl.value.wordSpacing};`);

  lines.push(`  --text-heading-lg-size: ${authored.webTextStyles.heading.lg.value.fontSize};`);
  lines.push(`  --text-heading-lg-lh: ${authored.webTextStyles.heading.lg.value.lineHeight};`);
  lines.push(`  --text-heading-lg-ls: ${authored.webTextStyles.heading.lg.value.letterSpacing};`);

  lines.push(`  --text-heading-md-size: ${authored.webTextStyles.heading.md.value.fontSize};`);
  lines.push(`  --text-heading-md-lh: ${authored.webTextStyles.heading.md.value.lineHeight};`);
  lines.push(`  --text-heading-md-ls: ${authored.webTextStyles.heading.md.value.letterSpacing};`);

  lines.push(`  --text-heading-sm-size: ${authored.webTextStyles.heading.sm.value.fontSize};`);
  lines.push(`  --text-heading-sm-lh: ${authored.webTextStyles.heading.sm.value.lineHeight};`);

  lines.push(`  --text-body-lg-size: ${authored.webTextStyles.body.lg.value.fontSize};`);
  lines.push(`  --text-body-lg-lh: ${authored.webTextStyles.body.lg.value.lineHeight};`);
  lines.push(`  --text-body-md-size: ${authored.webTextStyles.body.md.value.fontSize};`);
  lines.push(`  --text-body-md-lh: ${authored.webTextStyles.body.md.value.lineHeight};`);
  lines.push(`  --text-body-sm-size: ${authored.webTextStyles.body.sm.value.fontSize};`);
  lines.push(`  --text-body-sm-lh: ${authored.webTextStyles.body.sm.value.lineHeight};`);
  lines.push(`  --text-label-md-size: ${authored.webTextStyles.label.md.value.fontSize};`);
  lines.push(`  --text-label-md-lh: ${authored.webTextStyles.label.md.value.lineHeight};`);
  lines.push(`  --text-label-sm-size: ${authored.webTextStyles.label.sm.value.fontSize};`);
  lines.push(`  --text-label-sm-lh: ${authored.webTextStyles.label.sm.value.lineHeight};`);
  lines.push(`  --text-numeric-hero-size: ${authored.webTextStyles.numeric.hero.value.fontSize};`);

  return lines.join("\n");
}

export function renderStyles(tokens: BrandTokens): string {
  const { native, logo, fontsBase64 } = tokens;
  const lightThemeCss = renderThemeVars(
    "light",
    native.light.colors,
    native.light.shadows,
    logo.opacity.light,
  );
  const darkThemeCss = renderThemeVars(
    "dark",
    native.dark.colors,
    native.dark.shadows,
    logo.opacity.dark,
  );
  const staticVarsCss = renderStaticVars(tokens);
  const bpMd = `${native.breakpoints.md}px`;
  const bpLg = `${native.breakpoints.lg}px`;
  const uiSpecimensCss = getUiSpecimensCss();

  return `
@font-face {
  font-family: 'Plus Jakarta Sans Variable';
  font-style: normal;
  font-display: swap;
  font-weight: 200 800;
  src: url(data:font/woff2;base64,${fontsBase64.headingLatinWoff2}) format('woff2-variations');
  unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;
}

@font-face {
  font-family: 'Inter Variable';
  font-style: normal;
  font-display: swap;
  font-weight: 100 900;
  src: url(data:font/woff2;base64,${fontsBase64.bodyLatinWoff2}) format('woff2-variations');
  unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;
}

:root {
  color-scheme: light;
${staticVarsCss}
${lightThemeCss}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
${darkThemeCss}
  }
}

:root[data-theme="dark"] {
  color-scheme: dark;
${darkThemeCss}
}

:root[data-theme="light"] {
  color-scheme: light;
${lightThemeCss}
}

.logo-floor-light { display: var(--logo-floor-light-display); }
.logo-floor-dark { display: var(--logo-floor-dark-display); }
.themed-img-light { display: var(--show-on-light); }
.themed-img-dark { display: var(--show-on-dark); }

.theme-light {
  color-scheme: light;
${lightThemeCss}
}

.theme-dark {
  color-scheme: dark;
${darkThemeCss}
}

*, *::before, *::after {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}

:root[data-motion="reduce"] {
  scroll-behavior: auto;
}

:root[data-motion="reduce"] *,
:root[data-motion="reduce"] *::before,
:root[data-motion="reduce"] *::after {
  transition-duration: 0.01ms !important;
  animation-duration: 0.01ms !important;
}

html, body {
  margin: 0;
  padding: 0;
  overflow-x: clip;
  background-color: ${colorVar("surface.canvas")};
  color: ${colorVar("text.primary")};
  font-family: var(--font-body);
  font-size: var(--text-body-md-size);
  line-height: var(--text-body-md-lh);
  font-weight: var(--weight-regular);
  -webkit-font-smoothing: antialiased;
}

a {
  color: ${colorVar("primary")};
  text-decoration: underline;
  text-underline-offset: 3px;
}

a:hover {
  color: ${colorVar("primary.emphasis")};
}

:focus-visible {
  outline: 2px solid ${colorVar("border.focusRing")};
  outline-offset: 2px;
}

code {
  font-family: var(--font-mono);
  font-size: var(--text-label-sm-size);
  background-color: ${colorVar("surface.subtle")};
  color: ${colorVar("text.primary")};
  padding: 1px var(--space-1);
  border-radius: var(--radius-xs);
  border: 1px solid ${colorVar("border.subtle")};
  overflow-wrap: anywhere;
}

.num, td.num, th.num, .swatch-val {
  font-variant-numeric: tabular-nums;
}

.skip-link {
  position: absolute;
  left: -9999px;
  top: var(--space-2);
  background: ${colorVar("primary.solid")};
  color: ${colorVar("primary.foreground")};
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-control);
  font-weight: var(--weight-semibold);
  text-decoration: none;
  z-index: var(--z-skip-link);
}

.skip-link:focus {
  left: var(--space-4);
}

.book-bar {
  position: sticky;
  top: 0;
  z-index: var(--z-header);
  background-color: color-mix(in oklab, ${colorVar("surface.canvas")} 90%, transparent);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid ${colorVar("border")};
}

.book-bar-inner {
  max-width: 1320px;
  margin: 0 auto;
  padding: 10px var(--space-page-gutter-sm);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

@media (min-width: ${bpMd}) {
  .book-bar-inner {
    padding: 12px var(--space-page-gutter-md);
  }
}

@media (min-width: ${bpLg}) {
  .book-bar-inner {
    padding: 12px var(--space-page-gutter-lg);
  }
}

.book-bar-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  position: relative;
}

.book-brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  text-decoration: none;
  color: ${colorVar("text.primary")};
  font-family: var(--font-heading);
  font-size: var(--text-heading-sm-size);
  font-weight: var(--weight-bold);
  letter-spacing: -0.02em;
  min-height: 36px;
}

.book-brand:hover {
  color: ${colorVar("primary")};
}

.toc-drawer {
  position: relative;
}

.toc-trigger {
  list-style: none;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 36px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-full);
  border: 1px solid ${colorVar("border.strong")};
  background-color: ${colorVar("surface.card")};
  color: ${colorVar("text.primary")};
  font-size: var(--text-body-sm-size);
  font-weight: var(--weight-medium);
  cursor: pointer;
  user-select: none;
}

.toc-trigger::-webkit-details-marker {
  display: none;
}

.toc-trigger:hover {
  background-color: ${colorVar("surface.subtle")};
}

.toc-panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: min(320px, calc(100vw - 32px));
  max-height: 75vh;
  overflow-y: auto;
  background-color: ${colorVar("surface.overlay")};
  border: 1px solid ${colorVar("border.strong")};
  border-radius: var(--radius-card);
  box-shadow: ${shadowVar("overlay")};
  padding: var(--space-3);
  z-index: var(--z-dropdown);
}

.toc-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 2px;
}

.toc-list a {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  text-decoration: none;
  font-size: var(--text-body-sm-size);
  line-height: var(--text-body-sm-lh);
  font-weight: var(--weight-medium);
  color: ${colorVar("text.secondary")};
}

.toc-list a:hover {
  background-color: ${colorVar("surface.subtle")};
  color: ${colorVar("primary.emphasis")};
}

.toc-num {
  font-variant-numeric: tabular-nums;
  color: ${colorVar("text.muted")};
  font-size: var(--text-label-sm-size);
  min-width: var(--space-6);
}

.page-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.theme-switch {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin: 0;
  padding: 3px;
  border-radius: var(--radius-full);
  border: 1px solid ${colorVar("border.strong")};
  background-color: ${colorVar("surface.card")};
}

.theme-btn,
.motion-toggle {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  min-height: 34px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-full);
  border: 1px solid transparent;
  background-color: transparent;
  color: ${colorVar("text.secondary")};
  font-family: var(--font-body);
  font-size: var(--text-label-sm-size);
  font-weight: var(--weight-medium);
  cursor: pointer;
}

.motion-toggle {
  border-color: ${colorVar("border.strong")};
  background-color: ${colorVar("surface.card")};
  color: ${colorVar("text.primary")};
}

.theme-btn:hover,
.motion-toggle:hover {
  background-color: ${colorVar("surface.subtle")};
  color: ${colorVar("text.primary")};
}

.theme-btn[aria-pressed="true"],
.motion-toggle[aria-pressed="true"] {
  background-color: ${colorVar("primary.solid")};
  border-color: ${colorVar("primary.solid")};
  color: ${colorVar("primary.foreground")};
}

.theme-btn svg,
.motion-toggle svg {
  flex-shrink: 0;
}

.book-main {
  display: grid;
  min-width: 0;
}

.spread-inner {
  width: 100%;
  max-width: 1320px;
  margin: 0 auto;
  padding: 0 var(--space-page-gutter-sm);
  display: grid;
  gap: clamp(24px, 3.5vw, 44px);
  min-width: 0;
}

@media (min-width: ${bpMd}) {
  .spread-inner {
    padding: 0 var(--space-page-gutter-md);
  }
}

@media (min-width: ${bpLg}) {
  .spread-inner {
    padding: 0 var(--space-page-gutter-lg);
  }
}

.cover-spread {
  position: relative;
  overflow: hidden;
  min-height: min(86vh, 840px);
  display: grid;
  align-items: center;
  padding: clamp(48px, 8vw, 96px) 0 clamp(40px, 6vw, 72px);
  background-color: ${colorVar("surface.canvas")};
  background-image:
    radial-gradient(60% 55% at 15% 15%, color-mix(in oklab, ${colorVar("orb.skyTeal.core")} 10%, transparent), transparent 70%),
    radial-gradient(50% 50% at 88% 80%, color-mix(in oklab, ${colorVar("orb.violetRose.core")} 9%, transparent), transparent 70%);
}

.cover-orbs {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.glass-orb {
  position: relative;
  display: inline-block;
  flex: none;
  width: var(--orb-size, 4.5rem);
  aspect-ratio: 1;
  border-radius: 9999px;
  pointer-events: none;
  background:
    radial-gradient(circle at 31% 24%, color-mix(in oklab, var(--orb-light) 92%, transparent) 0 4%, color-mix(in oklab, var(--orb-light) 30%, transparent) 9%, transparent 20%),
    radial-gradient(circle at 66% 78%, color-mix(in oklab, currentColor 46%, transparent) 0, transparent 42%),
    radial-gradient(circle at 50% 50%, color-mix(in oklab, currentColor 6%, transparent) 0 46%, color-mix(in oklab, currentColor 26%, transparent) 78%, color-mix(in oklab, currentColor 58%, transparent) 100%);
  box-shadow:
    inset 0 0 0 1px color-mix(in oklab, currentColor 55%, transparent),
    inset 0 calc(var(--orb-size, 4.5rem) * 0.08) calc(var(--orb-size, 4.5rem) * 0.1) color-mix(in oklab, var(--orb-light) 28%, transparent),
    inset 0 calc(var(--orb-size, 4.5rem) * -0.1) calc(var(--orb-size, 4.5rem) * 0.18) color-mix(in oklab, currentColor 34%, transparent),
    0 calc(var(--orb-size, 4.5rem) * 0.22) calc(var(--orb-size, 4.5rem) * 0.3) calc(var(--orb-size, 4.5rem) * -0.16) color-mix(in oklab, currentColor 55%, transparent);
}

.glass-orb::after {
  content: "";
  position: absolute;
  inset: 3%;
  border-radius: 9999px;
  border: 1.5px solid transparent;
  border-top-color: color-mix(in oklab, var(--orb-light) 55%, transparent);
  border-left-color: color-mix(in oklab, var(--orb-light) 25%, transparent);
  transform: rotate(-12deg);
}

.glass-orb-sky { color: ${colorVar("orb.skyTeal.core")}; }
.glass-orb-teal { color: ${colorVar("orb.skyTeal.shade")}; }
.glass-orb-violet { color: ${colorVar("orb.violetRose.core")}; }
.glass-orb-rose { color: ${colorVar("orb.violetRose.shade")}; }

.cover-orb {
  position: absolute;
  opacity: 0.72;
}

.cover-orb-1 {
  --orb-size: clamp(4.5rem, 11vw, 9.5rem);
  top: 7%;
  right: 6%;
}

.cover-orb-2 {
  --orb-size: clamp(3rem, 7vw, 6rem);
  top: 18%;
  left: 5%;
}

.cover-orb-3 {
  --orb-size: clamp(3.5rem, 8.5vw, 7rem);
  bottom: 18%;
  right: 12%;
}

.cover-orb-4 {
  --orb-size: clamp(2.4rem, 5vw, 4.2rem);
  bottom: 24%;
  left: 11%;
}

.cover-content {
  position: relative;
  z-index: 1;
  display: grid;
  gap: clamp(24px, 4vw, 44px);
  justify-items: center;
  text-align: center;
}

.cover-mark-wrap {
  display: grid;
  place-items: center;
}

.cover-mark-wrap svg {
  width: clamp(132px, 20vw, 200px);
  height: auto;
}

.cover-kicker {
  margin: 0;
  font-size: var(--text-label-md-size);
  font-weight: var(--weight-semibold);
  color: ${colorVar("primary")};
}

.cover-title {
  font-family: var(--font-heading);
  font-size: clamp(2.85rem, 7vw, 5.5rem);
  line-height: 1.02;
  letter-spacing: -0.035em;
  word-spacing: var(--text-display-ws);
  font-weight: var(--weight-bold);
  margin: 0;
  color: ${colorVar("text.primary")};
}

.cover-lead {
  font-size: clamp(1.0625rem, 1.8vw, 1.375rem);
  line-height: 1.5;
  color: ${colorVar("text.secondary")};
  margin: 0;
  max-width: 46ch;
}

.cover-meta-line {
  font-size: var(--text-body-sm-size);
  color: ${colorVar("text.muted")};
  margin: 0;
  max-width: 56ch;
}

.cover-index {
  width: 100%;
  border-top: 1px solid ${colorVar("border")};
  padding-top: var(--space-6);
  text-align: left;
}

.cover-index-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(210px, 100%), 1fr));
  gap: var(--space-2) var(--space-5);
}

.cover-index-grid a {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  padding: var(--space-1) 0;
  text-decoration: none;
  font-size: var(--text-body-sm-size);
  font-weight: var(--weight-medium);
  color: ${colorVar("text.secondary")};
}

.cover-index-grid a:hover {
  color: ${colorVar("primary.emphasis")};
}

.chapter {
  display: grid;
  min-width: 0;
  scroll-margin-top: 64px;
}

.chapter-opener {
  padding: clamp(44px, 6.5vw, 88px) 0;
  border-top: 1px solid ${colorVar("border")};
  border-bottom: 1px solid ${colorVar("border")};
}

.chapter-opener-subtle {
  background-color: ${colorVar("surface.subtle")};
}

.chapter-opener-card {
  background-color: ${colorVar("surface.card")};
}

.chapter-opener-canvas {
  background-color: ${colorVar("surface.canvas")};
}

.chapter-opener-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: clamp(24px, 4vw, 56px);
  align-items: center;
}

@media (min-width: ${bpLg}) {
  .chapter-opener-grid {
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  }
}

.chapter-opener-copy {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
}

.chapter-num {
  font-family: var(--font-heading);
  font-size: clamp(3rem, 7vw, 5.25rem);
  font-weight: var(--weight-bold);
  line-height: 0.95;
  letter-spacing: -0.04em;
  color: ${colorVar("primary")};
}

.chapter-display-title {
  font-family: var(--font-heading);
  font-size: clamp(2rem, 4.4vw, 3.35rem);
  line-height: 1.08;
  letter-spacing: -0.03em;
  word-spacing: var(--text-display-ws);
  font-weight: var(--weight-bold);
  margin: 0;
  color: ${colorVar("text.primary")};
}

.chapter-lead {
  font-size: clamp(1.0625rem, 1.5vw, 1.25rem);
  line-height: 1.55;
  color: ${colorVar("text.secondary")};
  margin: 0;
  max-width: 46ch;
}

.chapter-opener-visual {
  min-width: 0;
}

.opener-visual-plate {
  background-color: ${colorVar("surface.card")};
  border: 1px solid ${colorVar("border")};
  border-radius: var(--radius-tray);
  box-shadow: ${shadowVar("card")};
  padding: clamp(20px, 3vw, 36px);
  display: grid;
  gap: var(--space-3);
  min-width: 0;
}

.spread {
  padding: clamp(36px, 5.5vw, 72px) 0;
}

.spread-subtle {
  background-color: ${colorVar("surface.subtle")};
  border-top: 1px solid ${colorVar("border.subtle")};
  border-bottom: 1px solid ${colorVar("border.subtle")};
}

.spread-card {
  background-color: ${colorVar("surface.card")};
  border-top: 1px solid ${colorVar("border.subtle")};
  border-bottom: 1px solid ${colorVar("border.subtle")};
}

.editorial-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: clamp(24px, 4vw, 52px);
  align-items: center;
}

@media (min-width: ${bpLg}) {
  .editorial-split {
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
  }
  .editorial-split-even {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
  .editorial-split-text-first {
    grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  }
}

.editorial-copy {
  display: grid;
  gap: var(--space-3);
  align-content: start;
  min-width: 0;
}

.chapter-kicker {
  font-size: var(--text-label-sm-size);
  font-weight: var(--weight-medium);
  line-height: var(--text-label-sm-lh);
  color: ${colorVar("text.muted")};
  font-variant-numeric: tabular-nums;
}

.sub-title {
  font-family: var(--font-heading);
  font-size: var(--text-heading-lg-size);
  line-height: var(--text-heading-lg-lh);
  letter-spacing: var(--text-heading-lg-ls);
  word-spacing: var(--text-display-ws);
  font-weight: var(--weight-semibold);
  margin: 0;
  color: ${colorVar("text.primary")};
}

.card-title {
  font-family: var(--font-heading);
  font-size: var(--text-heading-md-size);
  line-height: var(--text-heading-md-lh);
  letter-spacing: var(--text-heading-md-ls);
  word-spacing: var(--text-display-ws);
  font-weight: var(--weight-semibold);
  margin: 0;
  color: ${colorVar("text.primary")};
}

.prose {
  margin: 0;
  max-width: 62ch;
  color: ${colorVar("text.secondary")};
}

.prose strong {
  color: ${colorVar("text.primary")};
}

.screen-spread {
  display: grid;
  gap: var(--space-5);
  min-width: 0;
}

.screen-spread-head {
  display: grid;
  gap: var(--space-2);
  max-width: 60ch;
}

.screen-pair {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-5);
  align-items: start;
}

@media (min-width: ${bpLg}) {
  .screen-pair {
    grid-template-columns: minmax(0, 1.65fr) minmax(0, 0.72fr);
  }
}

.screen-frame {
  margin: 0;
  display: grid;
  gap: var(--space-2);
  min-width: 0;
}

.screen-frame-phone {
  max-width: 260px;
  width: 100%;
  justify-self: center;
}

@media (min-width: ${bpLg}) {
  .screen-frame-phone {
    max-width: none;
    justify-self: stretch;
  }
}

.screen-viewport {
  border-radius: var(--radius-card);
  border: 1px solid ${colorVar("border.strong")};
  box-shadow: ${shadowVar("raised")};
  overflow: hidden;
  background-color: ${colorVar("surface.card")};
}

.screen-img {
  width: 100%;
  height: auto;
  display: block;
}

.screen-caption,
.screen-pair-caption {
  margin: 0;
  font-size: var(--text-body-sm-size);
  line-height: var(--text-body-sm-lh);
  color: ${colorVar("text.muted")};
}

.card {
  background-color: ${colorVar("surface.card")};
  border: 1px solid ${colorVar("border")};
  border-radius: var(--radius-card);
  box-shadow: ${shadowVar("card")};
  padding: var(--space-5);
  display: grid;
  gap: var(--space-3);
  min-width: 0;
}

.card-subtle {
  background-color: ${colorVar("surface.subtle")};
  border: 1px solid ${colorVar("border")};
  border-radius: var(--radius-card);
  padding: var(--space-5);
  display: grid;
  gap: var(--space-3);
  min-width: 0;
}

.hero-panel {
  background-color: ${colorVar("surface.hero")};
  border: 1px solid ${colorVar("border.hero")};
  border-radius: var(--radius-tray);
  padding: var(--space-6);
  color: ${colorVar("text.onHero")};
  display: grid;
  gap: var(--space-2);
  min-width: 0;
}

.hero-figure {
  font-size: var(--text-numeric-hero-size);
  line-height: var(--text-display-lh);
  letter-spacing: var(--text-display-ls);
  font-weight: var(--weight-bold);
  font-variant-numeric: tabular-nums;
  color: ${colorVar("text.heroFigure")};
  margin: 0;
}

.quote-box {
  background-color: ${colorVar("surface.subtle")};
  border-left: 3px solid ${colorVar("primary")};
  border-radius: var(--radius-control);
  padding: var(--space-4) var(--space-5);
  margin: 0;
  display: grid;
  gap: var(--space-1);
  color: ${colorVar("text.primary")};
  min-width: 0;
}

.grid-2 {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-5);
}

@media (min-width: ${bpMd}) {
  .grid-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.grid-3 {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-4);
}

@media (min-width: ${bpMd}) {
  .grid-3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.grid-4 {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-4);
}

@media (min-width: ${bpMd}) {
  .grid-4 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: ${bpLg}) {
  .grid-4 {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.color-field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));
  gap: var(--space-4);
}

.color-field-card {
  border-radius: var(--radius-card);
  border: 1px solid ${colorVar("border")};
  box-shadow: ${shadowVar("card")};
  overflow: hidden;
  background-color: ${colorVar("surface.card")};
  display: grid;
  grid-template-rows: 136px 1fr;
  min-width: 0;
}

.color-field-fill {
  width: 100%;
  height: 100%;
  border-bottom: 1px solid ${colorVar("border.subtle")};
}

.color-field-meta {
  padding: var(--space-4);
  display: grid;
  gap: var(--space-2);
  align-content: start;
}

.color-field-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.swatch-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-3);
}

@media (min-width: ${bpMd}) {
  .swatch-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.swatch-card {
  background-color: ${colorVar("surface.card")};
  border: 1px solid ${colorVar("border")};
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: var(--space-3);
  align-items: start;
  min-width: 0;
}

.swatch-chip {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-control);
  border: 1px solid ${colorVar("border.strong")};
  flex-shrink: 0;
}

.swatch-meta {
  display: grid;
  gap: var(--space-1);
  min-width: 0;
}

.swatch-values {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  font-size: var(--text-label-sm-size);
  line-height: var(--text-label-sm-lh);
  color: ${colorVar("text.secondary")};
}

.swatch-note {
  font-size: var(--text-body-sm-size);
  line-height: var(--text-body-sm-lh);
  color: ${colorVar("text.muted")};
  margin: 0;
}

.theme-frame {
  background-color: ${colorVar("surface.canvas")};
  color: ${colorVar("text.primary")};
  border: 1px solid ${colorVar("border")};
  border-radius: var(--radius-tray);
  padding: clamp(20px, 3vw, 32px);
  display: grid;
  gap: var(--space-4);
  min-width: 0;
}

.logo-stage {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.logo-box {
  display: grid;
  place-items: center;
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background-color: ${colorVar("surface.card")};
  border: 1px solid ${colorVar("border")};
}

.diagram-figure {
  margin: 0;
  background-color: ${colorVar("surface.card")};
  border: 1px solid ${colorVar("border")};
  border-radius: var(--radius-card);
  box-shadow: ${shadowVar("card")};
  padding: var(--space-4);
  display: grid;
  gap: var(--space-3);
  min-width: 0;
}

.diagram-figure svg,
.doc-svg-wrap svg {
  width: 100%;
  height: auto;
  display: block;
}

.diagram-caption {
  font-size: var(--text-body-sm-size);
  line-height: var(--text-body-sm-lh);
  color: ${colorVar("text.muted")};
  margin: 0;
}

.ui-specimen-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
}

.ui-card-trio {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-4);
}

@media (min-width: ${bpLg}) {
  .ui-card-trio {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.ui-card-inner {
  display: grid;
  gap: var(--space-3);
}

.ui-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.ui-card-figure {
  margin: 0;
  font-size: var(--text-heading-lg-size);
  line-height: 1.2;
  font-weight: var(--weight-bold);
  color: ${colorVar("text.primary")};
}

.domain-tile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr));
  gap: var(--space-3);
}

.domain-tile-card {
  background-color: ${colorVar("surface.card")};
  border: 1px solid ${colorVar("border")};
  border-radius: var(--radius-card);
  padding: var(--space-4);
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  min-width: 0;
}

.domain-tile-meta {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.domain-tile-name {
  font-size: var(--text-body-sm-size);
  font-weight: var(--weight-semibold);
  color: ${colorVar("text.primary")};
}

.domain-tile-colour {
  font-size: var(--text-label-sm-size);
  font-weight: var(--weight-medium);
  color: ${colorVar("primary")};
}

.specimen-sheet {
  background-color: ${colorVar("surface.card")};
  border: 1px solid ${colorVar("border")};
  border-radius: var(--radius-tray);
  box-shadow: ${shadowVar("card")};
  padding: clamp(24px, 4vw, 44px);
  display: grid;
  gap: var(--space-4);
  min-width: 0;
}

.specimen-glyph {
  font-size: clamp(3.5rem, 8vw, 6.5rem);
  line-height: 0.95;
  letter-spacing: -0.04em;
  font-weight: var(--weight-bold);
  color: ${colorVar("text.primary")};
}

.tabular-demo-ledger {
  background-color: ${colorVar("surface.subtle")};
  border: 1px solid ${colorVar("border")};
  border-radius: var(--radius-card);
  padding: var(--space-4);
  display: grid;
  gap: var(--space-2);
}

.tabular-demo-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid ${colorVar("border.subtle")};
}

.tabular-demo-row:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.tabular-demo-fig {
  font-family: var(--font-body);
  font-weight: var(--weight-semibold);
  font-variant-numeric: tabular-nums;
  color: ${colorVar("text.primary")};
}

.type-sample-row {
  padding: var(--space-4) 0;
  border-bottom: 1px solid ${colorVar("border.subtle")};
  display: grid;
  gap: var(--space-2);
}

.type-sample-row:last-child {
  border-bottom: none;
}

.type-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  font-size: var(--text-label-sm-size);
  color: ${colorVar("text.muted")};
}

.example-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  background-color: ${colorVar("surface.sunken")};
  border: 1px solid ${colorVar("border")};
  color: ${colorVar("text.secondary")};
  font-size: var(--text-label-sm-size);
  line-height: var(--text-label-sm-lh);
  font-weight: var(--weight-medium);
}

.badge-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.pill {
  display: inline-flex;
  align-items: center;
  padding: 3px var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-label-sm-size);
  font-weight: var(--weight-medium);
  border: 1px solid ${colorVar("border")};
  background-color: ${colorVar("surface.subtle")};
  color: ${colorVar("text.primary")};
}

.radius-demo {
  height: 56px;
  background-color: ${colorVar("primary.subtle")};
  border: 1.5px solid ${colorVar("primary.border")};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-label-sm-size);
  font-weight: var(--weight-semibold);
  color: ${colorVar("text.primary")};
}

.shadow-tray {
  background-color: ${colorVar("surface.subtle")};
  border: 1px solid ${colorVar("border")};
  border-radius: var(--radius-tray);
  padding: clamp(20px, 3vw, 32px);
  display: grid;
  gap: var(--space-4);
}

.shadow-demo {
  background-color: ${colorVar("surface.card")};
  border: 1px solid ${colorVar("border")};
  border-radius: var(--radius-card);
  padding: var(--space-5);
  display: grid;
  gap: var(--space-2);
  min-width: 0;
}

.tier-strip-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-4);
}

@media (min-width: ${bpLg}) {
  .tier-strip-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.tier-card {
  background-color: ${colorVar("surface.card")};
  border: 1px solid ${colorVar("border")};
  border-top: 3px solid ${colorVar("primary")};
  border-radius: var(--radius-card);
  padding: var(--space-5);
  display: grid;
  gap: var(--space-3);
  align-content: start;
}

.tier-card-muted {
  border-top-color: ${colorVar("border.strong")};
}

.tier-card-stop {
  border-top-color: ${colorVar("status.danger.text")};
}

.motion-stage {
  background-color: ${colorVar("surface.card")};
  border: 1px solid ${colorVar("border")};
  border-radius: var(--radius-tray);
  padding: var(--space-5);
  display: grid;
  gap: var(--space-3);
  min-width: 0;
}

.contrast-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(210px, 100%), 1fr));
  gap: var(--space-4);
}

.contrast-stat {
  background-color: ${colorVar("surface.card")};
  border: 1px solid ${colorVar("border")};
  border-radius: var(--radius-card);
  padding: var(--space-4);
  display: grid;
  gap: var(--space-1);
}

.contrast-ratio {
  font-family: var(--font-heading);
  font-size: var(--text-heading-lg-size);
  font-weight: var(--weight-bold);
  color: ${colorVar("primary")};
  font-variant-numeric: tabular-nums;
}

.plain-list {
  margin: 0;
  padding-left: var(--space-5);
  display: grid;
  gap: var(--space-2);
  color: ${colorVar("text.secondary")};
}

.icon-img {
  width: 96px;
  height: 96px;
  border-radius: var(--radius-tray);
  border: 1px solid ${colorVar("border")};
  display: block;
}

.favicon-img {
  width: 48px;
  height: 48px;
  display: block;
}

.do-dont-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-4);
}

@media (min-width: ${bpMd}) {
  .do-dont-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.timeline {
  display: grid;
  gap: var(--space-6);
}

.timeline-entry {
  background-color: ${colorVar("surface.card")};
  border: 1px solid ${colorVar("border")};
  border-left: 3px solid ${colorVar("primary")};
  border-radius: var(--radius-card);
  box-shadow: ${shadowVar("card")};
  padding: clamp(20px, 3vw, 32px);
  display: grid;
  gap: var(--space-4);
  min-width: 0;
}

.timeline-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
}

.history-figure {
  margin: 0;
  display: grid;
  gap: var(--space-2);
  min-width: 0;
}

.history-img,
.history-video {
  width: 100%;
  height: auto;
  display: block;
  border-radius: var(--radius-card);
  border: 1px solid ${colorVar("border")};
  box-shadow: ${shadowVar("card")};
  background-color: ${colorVar("surface.sunken")};
}

.contact-tile {
  margin: 0;
  background-color: ${colorVar("surface.subtle")};
  border: 1px solid ${colorVar("border")};
  border-radius: var(--radius-card);
  padding: var(--space-3);
  display: grid;
  gap: var(--space-3);
  align-content: start;
  min-width: 0;
}

.contact-tile-chosen {
  border: 2px solid ${colorVar("primary")};
  background-color: ${colorVar("primary.subtle")};
}

.contact-tile-meta {
  display: grid;
  gap: 2px;
  font-size: var(--text-label-sm-size);
  line-height: var(--text-label-sm-lh);
}

.contact-tile-title {
  font-weight: var(--weight-semibold);
  color: ${colorVar("text.primary")};
}

.contact-tile-date {
  color: ${colorVar("text.muted")};
  font-variant-numeric: tabular-nums;
}

.logo-alt-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-4);
}

@media (min-width: ${bpMd}) {
  .logo-alt-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.logo-showcase-hero {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-6);
  padding: clamp(20px, 3vw, 36px);
  border-radius: var(--radius-tray);
  border: 1px solid ${colorVar("border")};
  background-color: ${colorVar("surface.card")};
  box-shadow: ${shadowVar("card")};
}

.brand-wordmark {
  font-family: var(--font-heading);
  font-size: clamp(2.5rem, 5vw, 4rem);
  line-height: 1.05;
  letter-spacing: -0.03em;
  word-spacing: var(--text-display-ws);
  font-weight: var(--weight-bold);
  color: ${colorVar("text.primary")};
}

.reading-order-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-2);
}

.reading-order-step {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background-color: ${colorVar("surface.card")};
  border: 1px solid ${colorVar("border")};
  border-radius: var(--radius-control);
}

.reading-order-step-dashed {
  background-color: transparent;
  border-style: dashed;
  border-color: ${colorVar("border.input")};
}

.reading-step-num {
  width: 26px;
  height: 26px;
  border-radius: var(--radius-full);
  background-color: ${colorVar("primary.subtle")};
  color: ${colorVar("primary")};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-label-sm-size);
  font-weight: var(--weight-bold);
  flex-shrink: 0;
}

.doc-svg-wrap svg {
  max-width: 340px;
  margin: 0 auto;
}

.flat-scene-wrap svg {
  max-width: 240px;
  margin: 0 auto;
}

.doc-shadow {
  opacity: var(--doc-shadow-op);
  filter: blur(8px);
}

.scene-ground { fill: var(--scene-ground); }
.scene-apricot { fill: ${colorVar("chart.debt")}; fill-opacity: var(--scene-apricot-op); }
.scene-sage { fill: ${colorVar("chart.wealth")}; }
.scene-teal-soft { fill: ${colorVar("primary.subtle")}; }
.scene-teal { fill: ${colorVar("primary")}; }
.scene-leaf { fill: ${colorVar("primary")}; }
.scene-paper { fill: ${colorVar("surface.card")}; }
.scene-accent { fill: ${colorVar("accent")}; }
.scene-dots { stroke: ${colorVar("text.muted")}; fill: none; stroke-width: 3; stroke-linecap: round; stroke-dasharray: 1 9; }
.scene-stem { stroke: ${colorVar("chart.wealth")}; fill: none; stroke-width: 4; stroke-linecap: round; }
.scene-pole { stroke: ${colorVar("primary")}; fill: none; stroke-width: 5; stroke-linecap: round; }
.scene-tick { stroke: ${colorVar("primary.foreground")}; fill: none; stroke-width: 4.5; stroke-linecap: round; stroke-linejoin: round; }

.ref-stack {
  display: grid;
  gap: var(--space-3);
}

.ref-section {
  background-color: ${colorVar("surface.card")};
  border: 1px solid ${colorVar("border")};
  border-radius: var(--radius-card);
  overflow: hidden;
}

.ref-summary {
  list-style: none;
  padding: var(--space-4) var(--space-5);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  cursor: pointer;
  font-family: var(--font-heading);
  font-size: var(--text-heading-sm-size);
  font-weight: var(--weight-semibold);
  color: ${colorVar("text.primary")};
}

.ref-summary::-webkit-details-marker {
  display: none;
}

.ref-summary:hover {
  background-color: ${colorVar("surface.subtle")};
}

.ref-summary-meta {
  font-family: var(--font-body);
  font-size: var(--text-label-sm-size);
  font-weight: var(--weight-medium);
  color: ${colorVar("text.muted")};
  font-variant-numeric: tabular-nums;
}

.ref-body {
  padding: var(--space-5);
  border-top: 1px solid ${colorVar("border.subtle")};
  display: grid;
  gap: var(--space-4);
}

.ref-scale-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-3);
}

@media (min-width: ${bpMd}) {
  .ref-scale-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.ref-scale-row {
  background-color: ${colorVar("surface.subtle")};
  border: 1px solid ${colorVar("border.subtle")};
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
  display: grid;
  gap: var(--space-2);
  min-width: 0;
}

.ref-scale-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
}

.ref-scale-val {
  font-size: var(--text-body-sm-size);
  color: ${colorVar("text.primary")};
}

.ref-ruler-track {
  height: 8px;
  border-radius: var(--radius-full);
  background-color: ${colorVar("surface.sunken")};
  border: 1px solid ${colorVar("border.subtle")};
  overflow: hidden;
}

.ref-ruler-fill {
  height: 100%;
  border-radius: var(--radius-full);
  background-color: ${colorVar("primary")};
}

.ref-ruler-layer {
  background-color: ${colorVar("accent")};
}

.ref-radius-card {
  background-color: ${colorVar("surface.subtle")};
  border: 1px solid ${colorVar("border.subtle")};
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: var(--space-3);
  align-items: center;
  min-width: 0;
}

.ref-radius-shape {
  width: 56px;
  height: 44px;
  background-color: ${colorVar("primary.subtle")};
  border: 1.5px solid ${colorVar("primary")};
}

.ref-radius-meta {
  display: grid;
  gap: var(--space-1);
  min-width: 0;
}

.ref-type-list {
  display: grid;
  gap: var(--space-3);
}

.ref-type-row {
  background-color: ${colorVar("surface.subtle")};
  border: 1px solid ${colorVar("border.subtle")};
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  display: grid;
  gap: var(--space-2);
  min-width: 0;
}

.table-wrap {
  width: 100%;
  overflow-x: auto;
  border: 1px solid ${colorVar("border")};
  border-radius: var(--radius-card);
  background-color: ${colorVar("surface.card")};
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-body-sm-size);
  line-height: var(--text-body-sm-lh);
  text-align: left;
}

th, td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid ${colorVar("border.subtle")};
  vertical-align: top;
}

th {
  font-weight: var(--weight-semibold);
  color: ${colorVar("text.primary")};
  background-color: ${colorVar("surface.subtle")};
}

tr:last-child td {
  border-bottom: none;
}

.book-footer {
  border-top: 1px solid ${colorVar("border")};
  padding: var(--space-6) 0 var(--space-10);
  color: ${colorVar("text.muted")};
  font-size: var(--text-body-sm-size);
}

.book-footer-inner {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-3);
}

${uiSpecimensCss}

/* Run B hook: live motion demos and @media print stylesheet go below */
`.trim();
}
