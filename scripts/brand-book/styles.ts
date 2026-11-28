import type { ColorKey, ShadowKey } from "../../packages/tokens/src/native.generated";
import { type BrandTokens, colorVar, shadowVar, toCssIdent } from "./tokens";

function renderThemeVars(
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
    native.light.colors,
    native.light.shadows,
    logo.opacity.light,
  );
  const darkThemeCss = renderThemeVars(native.dark.colors, native.dark.shadows, logo.opacity.dark);
  const staticVarsCss = renderStaticVars(tokens);
  const bpMd = `${native.breakpoints.md}px`;
  const bpLg = `${native.breakpoints.lg}px`;

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
  color-scheme: light dark;
${staticVarsCss}
${lightThemeCss}
}

@media (prefers-color-scheme: dark) {
  :root {
${darkThemeCss}
  }
  .logo-floor-light { display: none; }
  .logo-floor-dark { display: inline; }
}

.logo-floor-light { display: inline; }
.logo-floor-dark { display: none; }

.theme-light {
  color-scheme: light;
${lightThemeCss}
}
.theme-light .logo-floor-light { display: inline; }
.theme-light .logo-floor-dark { display: none; }

.theme-dark {
  color-scheme: dark;
${darkThemeCss}
}
.theme-dark .logo-floor-light { display: none; }
.theme-dark .logo-floor-dark { display: inline; }

*, *::before, *::after {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
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

.page-shell {
  max-width: var(--size-page-max);
  margin: 0 auto;
  padding: var(--space-page-top-sm) var(--space-page-gutter-sm) var(--space-20);
}

@media (min-width: ${bpMd}) {
  .page-shell {
    padding: var(--space-page-top-sm) var(--space-page-gutter-md) var(--space-20);
  }
}

@media (min-width: ${bpLg}) {
  .page-shell {
    padding: var(--space-page-top-lg) var(--space-page-gutter-lg) var(--space-24);
  }
}

.book-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-8);
  align-items: start;
}

@media (min-width: ${bpLg}) {
  .book-layout {
    grid-template-columns: 240px minmax(0, 1fr);
    gap: var(--space-10);
  }
}

.toc-sidebar {
  background-color: ${colorVar("surface.card")};
  border: 1px solid ${colorVar("border")};
  border-radius: var(--radius-card);
  box-shadow: ${shadowVar("card")};
  padding: var(--space-density-card-pad);
  min-width: 0;
}

@media (min-width: ${bpLg}) {
  .toc-sidebar {
    position: sticky;
    top: var(--space-6);
    max-height: calc(100vh - var(--space-12));
    overflow-y: auto;
  }
}

.toc-title {
  font-family: var(--font-heading);
  font-size: var(--text-heading-sm-size);
  font-weight: var(--weight-semibold);
  line-height: var(--text-heading-sm-lh);
  word-spacing: var(--text-display-ws);
  margin: 0 0 var(--space-3);
  color: ${colorVar("text.primary")};
}

.toc-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-1);
}

.toc-list a {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
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
  min-width: var(--space-5);
}

.book-main {
  display: grid;
  gap: var(--space-page-section);
  min-width: 0;
}

.cover-card {
  position: relative;
  background-color: ${colorVar("material.glass.fill")};
  background-image: linear-gradient(155deg, ${colorVar("material.glass.sheen")}, transparent 42%);
  border: 1px solid ${colorVar("material.glass.border")};
  border-radius: var(--radius-tray);
  box-shadow: ${shadowVar("glass")};
  padding: var(--space-6);
  display: grid;
  gap: var(--space-5);
  min-width: 0;
}

@media (min-width: ${bpMd}) {
  .cover-card {
    padding: var(--space-10);
  }
}

.cover-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-5);
}

.cover-title {
  font-family: var(--font-heading);
  font-size: var(--text-display-size);
  line-height: var(--text-display-lh);
  letter-spacing: var(--text-display-ls);
  word-spacing: var(--text-display-ws);
  font-weight: var(--weight-bold);
  margin: 0;
  color: ${colorVar("text.primary")};
}

.cover-lead {
  font-size: var(--text-body-lg-size);
  line-height: var(--text-body-lg-lh);
  color: ${colorVar("text.secondary")};
  margin: 0;
  max-width: 64ch;
}

.chapter {
  display: grid;
  gap: var(--space-5);
  min-width: 0;
  scroll-margin-top: var(--space-6);
}

.chapter-head {
  border-bottom: 2px solid ${colorVar("border.section")};
  padding-bottom: var(--space-3);
  display: grid;
  gap: var(--space-1);
}

.chapter-kicker {
  font-size: var(--text-label-sm-size);
  font-weight: var(--weight-medium);
  line-height: var(--text-label-sm-lh);
  color: ${colorVar("text.muted")};
  font-variant-numeric: tabular-nums;
}

.chapter-title {
  font-family: var(--font-heading);
  font-size: var(--text-heading-xl-size);
  line-height: var(--text-heading-xl-lh);
  letter-spacing: var(--text-heading-xl-ls);
  word-spacing: var(--text-heading-xl-ws);
  font-weight: var(--weight-bold);
  margin: 0;
  color: ${colorVar("text.primary")};
}

.sub-title {
  font-family: var(--font-heading);
  font-size: var(--text-heading-lg-size);
  line-height: var(--text-heading-lg-lh);
  letter-spacing: var(--text-heading-lg-ls);
  word-spacing: var(--text-display-ws);
  font-weight: var(--weight-semibold);
  margin: var(--space-2) 0 0;
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
  max-width: 72ch;
  color: ${colorVar("text.secondary")};
}

.prose strong {
  color: ${colorVar("text.primary")};
}

.source-cite {
  margin: 0;
  font-size: var(--text-label-sm-size);
  line-height: var(--text-label-sm-lh);
  color: ${colorVar("text.muted")};
}

.card {
  background-color: ${colorVar("surface.card")};
  border: 1px solid ${colorVar("border")};
  border-radius: var(--radius-card);
  box-shadow: ${shadowVar("card")};
  padding: var(--space-density-card-pad);
  display: grid;
  gap: var(--space-3);
  min-width: 0;
}

.card-subtle {
  background-color: ${colorVar("surface.subtle")};
  border: 1px solid ${colorVar("border")};
  border-radius: var(--radius-card);
  padding: var(--space-density-card-pad);
  display: grid;
  gap: var(--space-3);
  min-width: 0;
}

.card-glass {
  background-color: ${colorVar("material.glass.fill")};
  background-image: linear-gradient(155deg, ${colorVar("material.glass.sheen")}, transparent 42%);
  border: 1px solid ${colorVar("material.glass.border")};
  border-radius: var(--radius-card);
  box-shadow: ${shadowVar("glass")};
  padding: var(--space-density-card-pad);
  display: grid;
  gap: var(--space-3);
  min-width: 0;
}

.card-paper {
  background-color: ${colorVar("material.paper.fill")};
  background-image: repeating-linear-gradient(0deg, ${colorVar("material.paper.rule")} 0 1px, transparent 1px 4px);
  border: 1px solid ${colorVar("material.paper.edge")};
  border-radius: var(--radius-control);
  box-shadow: ${shadowVar("paper")};
  padding: var(--space-density-card-pad);
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
  padding: var(--space-3) var(--space-4);
  margin: 0;
  display: grid;
  gap: var(--space-1);
  color: ${colorVar("text.primary")};
  min-width: 0;
}

.grid-2 {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-4);
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
  border-radius: var(--radius-card);
  padding: var(--space-5);
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

.table-wrap {
  width: 100%;
  overflow-x: auto;
  border: 1px solid ${colorVar("border")};
  border-radius: var(--radius-card);
  background-color: ${colorVar("surface.card")};
  box-shadow: ${shadowVar("card")};
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
  padding: 2px var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-label-sm-size);
  font-weight: var(--weight-medium);
  border: 1px solid ${colorVar("border")};
  background-color: ${colorVar("surface.subtle")};
  color: ${colorVar("text.primary")};
}

.radius-demo {
  height: 52px;
  background-color: ${colorVar("primary.subtle")};
  border: 1px solid ${colorVar("primary.border")};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-label-sm-size);
  font-weight: var(--weight-medium);
  color: ${colorVar("text.primary")};
}

.shadow-demo {
  background-color: ${colorVar("surface.card")};
  border: 1px solid ${colorVar("border")};
  border-radius: var(--radius-card);
  padding: var(--space-4);
  display: grid;
  gap: var(--space-2);
  min-width: 0;
}

.type-sample-row {
  padding: var(--space-4);
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
  width: 40px;
  height: 40px;
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

.book-footer {
  border-top: 1px solid ${colorVar("border")};
  padding-top: var(--space-5);
  color: ${colorVar("text.muted")};
  font-size: var(--text-body-sm-size);
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-3);
}
`.trim();
}
