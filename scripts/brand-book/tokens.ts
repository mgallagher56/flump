import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { NAV_BREAKPOINT, NAV_WIDE_BREAKPOINT } from "../../packages/tokens/src/breakpoints";
import { elevationShadows } from "../../packages/tokens/src/elevation";
import {
  colors as primitiveColors,
  fontSizes as primitiveFontSizes,
  radii as primitiveRadii,
  shadows as primitiveShadows,
  spacing as primitiveSpacing,
  semanticTokens,
} from "../../packages/tokens/src/index";
import {
  densityRadii,
  densitySizes,
  densitySpacing,
  pageSpacing,
  sizes as primitiveSizes,
  zIndex as primitiveZIndex,
} from "../../packages/tokens/src/layout";
import {
  marketingDurations,
  marketingEasings,
  durations as primitiveDurations,
  easings as primitiveEasings,
} from "../../packages/tokens/src/motion";
import {
  breakpoints,
  type ColorKey,
  dark,
  durations,
  easings,
  fontSizes,
  light,
  textStyles as nativeTextStyles,
  radii,
  type ShadowKey,
  sizes,
  spacing,
  zIndex,
} from "../../packages/tokens/src/native.generated";
import {
  fontFamilies,
  fonts,
  fontWeights,
  letterSpacings,
  lineHeights,
  textStyles as webTextStyles,
} from "../../packages/tokens/src/typography";
import {
  floorLayout,
  LOGO_FLOOR,
  LOGO_OPACITY,
  LOGO_ORBS,
  LOGO_VIEWBOX,
  orbLayout,
} from "../../packages/ui/src/primitives/FlumpLogo/FlumpLogo.art";
import {
  DOCUMENT_GRID_WIDTH,
  DOCUMENT_MIN_TEXT,
  DOCUMENT_MIN_WIDTH,
  documentDefinitions,
  documentEffects,
  documentRoleTokens,
  EXAMPLE_TAG,
  tornEdgePath,
} from "../../packages/ui/src/primitives/Illustration/Illustration.documents";
import { sceneDefinitions } from "../../packages/ui/src/primitives/Illustration/Illustration.scenes";

export const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url)).replace(/\/$/, "");

function resolveFontPath(pkg: string, file: string): string {
  const candidates = [
    resolve(REPO_ROOT, "packages/ui/node_modules", pkg, "files", file),
    resolve(REPO_ROOT, "node_modules", pkg, "files", file),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`Missing font file ${file} in ${pkg}`);
}

function readFontBase64(pkg: string, file: string): string {
  return readFileSync(resolveFontPath(pkg, file)).toString("base64");
}

export interface BrandTokens {
  native: {
    light: typeof light;
    dark: typeof dark;
    spacing: typeof spacing;
    radii: typeof radii;
    sizes: typeof sizes;
    fontSizes: typeof fontSizes;
    textStyles: typeof nativeTextStyles;
    durations: typeof durations;
    easings: typeof easings;
    zIndex: typeof zIndex;
    breakpoints: typeof breakpoints;
  };
  authored: {
    primitiveColors: typeof primitiveColors;
    primitiveFontSizes: typeof primitiveFontSizes;
    primitiveRadii: typeof primitiveRadii;
    primitiveShadows: typeof primitiveShadows;
    primitiveSpacing: typeof primitiveSpacing;
    semanticTokens: typeof semanticTokens;
    elevationShadows: typeof elevationShadows;
    pageSpacing: typeof pageSpacing;
    densitySpacing: typeof densitySpacing;
    densitySizes: typeof densitySizes;
    densityRadii: typeof densityRadii;
    primitiveSizes: typeof primitiveSizes;
    primitiveZIndex: typeof primitiveZIndex;
    primitiveDurations: typeof primitiveDurations;
    primitiveEasings: typeof primitiveEasings;
    marketingDurations: typeof marketingDurations;
    marketingEasings: typeof marketingEasings;
    fontFamilies: typeof fontFamilies;
    fonts: typeof fonts;
    fontWeights: typeof fontWeights;
    lineHeights: typeof lineHeights;
    letterSpacings: typeof letterSpacings;
    webTextStyles: typeof webTextStyles;
    navBreakpoint: typeof NAV_BREAKPOINT;
    navWideBreakpoint: typeof NAV_WIDE_BREAKPOINT;
  };
  logo: {
    viewBox: typeof LOGO_VIEWBOX;
    orbs: typeof LOGO_ORBS;
    floor: typeof LOGO_FLOOR;
    opacity: typeof LOGO_OPACITY;
    orbLayout: typeof orbLayout;
    floorLayout: typeof floorLayout;
    faviconSvg: string;
  };
  illustration: {
    gridWidth: typeof DOCUMENT_GRID_WIDTH;
    minWidth: typeof DOCUMENT_MIN_WIDTH;
    minText: typeof DOCUMENT_MIN_TEXT;
    exampleTag: typeof EXAMPLE_TAG;
    definitions: typeof documentDefinitions;
    scenes: typeof sceneDefinitions;
    roleTokens: typeof documentRoleTokens;
    effects: typeof documentEffects;
    tornEdgePath: typeof tornEdgePath;
  };
  fontsBase64: {
    headingLatinWoff2: string;
    bodyLatinWoff2: string;
  };
}

export function loadBrandTokens(): BrandTokens {
  const faviconSvg = readFileSync(resolve(REPO_ROOT, "apps/web/public/favicon.svg"), "utf8");
  return {
    native: {
      light,
      dark,
      spacing,
      radii,
      sizes,
      fontSizes,
      textStyles: nativeTextStyles,
      durations,
      easings,
      zIndex,
      breakpoints,
    },
    authored: {
      primitiveColors,
      primitiveFontSizes,
      primitiveRadii,
      primitiveShadows,
      primitiveSpacing,
      semanticTokens,
      elevationShadows,
      pageSpacing,
      densitySpacing,
      densitySizes,
      densityRadii,
      primitiveSizes,
      primitiveZIndex,
      primitiveDurations,
      primitiveEasings,
      marketingDurations,
      marketingEasings,
      fontFamilies,
      fonts,
      fontWeights,
      lineHeights,
      letterSpacings,
      webTextStyles,
      navBreakpoint: NAV_BREAKPOINT,
      navWideBreakpoint: NAV_WIDE_BREAKPOINT,
    },
    logo: {
      viewBox: LOGO_VIEWBOX,
      orbs: LOGO_ORBS,
      floor: LOGO_FLOOR,
      opacity: LOGO_OPACITY,
      orbLayout,
      floorLayout,
      faviconSvg,
    },
    illustration: {
      gridWidth: DOCUMENT_GRID_WIDTH,
      minWidth: DOCUMENT_MIN_WIDTH,
      minText: DOCUMENT_MIN_TEXT,
      exampleTag: EXAMPLE_TAG,
      definitions: documentDefinitions,
      scenes: sceneDefinitions,
      roleTokens: documentRoleTokens,
      effects: documentEffects,
      tornEdgePath,
    },
    fontsBase64: {
      headingLatinWoff2: readFontBase64(
        "@fontsource-variable/plus-jakarta-sans",
        "plus-jakarta-sans-latin-wght-normal.woff2",
      ),
      bodyLatinWoff2: readFontBase64("@fontsource-variable/inter", "inter-latin-wght-normal.woff2"),
    },
  };
}

export function toCssIdent(path: string): string {
  return path
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export function colorVar(key: ColorKey): string {
  return `var(--color-${toCssIdent(key)})`;
}

export function shadowVar(key: ShadowKey): string {
  return `var(--shadow-${toCssIdent(key)})`;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
