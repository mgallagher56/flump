import { renderShadowSpecimen, renderSourceCite, renderTokenRow } from "../renderHelpers";
import type { BrandTokens } from "../tokens";
import { spacingBlocks } from "./spacingHelper";

export function renderLayoutChapter(tokens: BrandTokens): string {
  const { native } = tokens;

  const spacingRows = [
    ["spacing.page.gutter.sm", `${native.spacing["page.gutter.sm"]}px`, "Phone gutter"],
    [
      "spacing.page.gutter.md",
      `${native.spacing["page.gutter.md"]}px`,
      "Tablet gutter (from 768px)",
    ],
    [
      "spacing.page.gutter.lg",
      `${native.spacing["page.gutter.lg"]}px`,
      "Desktop gutter (from 1024px)",
    ],
    ["spacing.page.top.sm", `${native.spacing["page.top.sm"]}px`, "App header to h1 on phones"],
    ["spacing.page.top.lg", `${native.spacing["page.top.lg"]}px`, "App header to h1 from 1024px"],
    [
      "spacing.page.section",
      `${native.spacing["page.section"]}px`,
      "Gap between page sections (E17 5A)",
    ],
    [
      "spacing.density.cardPad",
      `${native.spacing["density.cardPad"]}px`,
      "Card padding (14px in compact density)",
    ],
    [
      "spacing.density.gap",
      `${native.spacing["density.gap"]}px`,
      "Gap between cards in a grid (10px compact)",
    ],
    [
      "spacing.density.rowPadY",
      `${native.spacing["density.rowPadY"]}px`,
      "Row vertical padding (8px compact)",
    ],
    [
      "spacing.density.controlPadX",
      `${native.spacing["density.controlPadX"]}px`,
      "Control horizontal padding (10px compact)",
    ],
    [
      "spacing.density.controlPadY",
      `${native.spacing["density.controlPadY"]}px`,
      "Control vertical padding (6px compact)",
    ],
  ] as const;

  const sizeRows = [
    ["sizes.page.max", `${native.sizes["page.max"]}px`, "Maximum content width inside PageBody"],
    [
      "sizes.touch",
      `${native.sizes.touch}px`,
      "Minimum touch target (44 by 44px; never shrinks in compact)",
    ],
    ["sizes.control.sm", `${native.sizes["control.sm"]}px`, "Small control height (28px compact)"],
    [
      "sizes.control.md",
      `${native.sizes["control.md"]}px`,
      "Default control height (32px compact)",
    ],
    ["sizes.control.lg", `${native.sizes["control.lg"]}px`, "Large control height (40px compact)"],
  ] as const;

  const breakpointRows = [
    ["breakpoints.sm", `${native.breakpoints.sm}px`, "Small landscape / large phone"],
    [
      "breakpoints.md",
      `${native.breakpoints.md}px`,
      "NAV_BREAKPOINT: switches phone drawer/bottom bar to compact top bar",
    ],
    [
      "breakpoints.lg",
      `${native.breakpoints.lg}px`,
      "NAV_WIDE_BREAKPOINT: full top bar and desktop simulator split",
    ],
    ["breakpoints.xl", `${native.breakpoints.xl}px`, "Desktop reference viewport (1280px)"],
    ["breakpoints.2xl", `${native.breakpoints["2xl"]}px`, "Wide desktop"],
  ] as const;

  const radiusItems: ReadonlyArray<{
    key: keyof typeof native.radii;
    label: string;
    note: string;
  }> = [
    { key: "none", label: "radii.none", note: "Square edges" },
    { key: "xs", label: "radii.xs", note: "Tags inside dense tables" },
    { key: "sm", label: "radii.sm", note: "Small controls (4px compact)" },
    {
      key: "control",
      label: "radii.control",
      note: "Buttons, inputs, slider value pill (6px compact)",
    },
    { key: "lg", label: "radii.lg", note: "Selected tab thumb, icon tiles (8px compact)" },
    { key: "card", label: "radii.card", note: "Cards, KPI cards, tables, drawers (8px compact)" },
    {
      key: "tray",
      label: "radii.tray",
      note: "Dialogs, sheets, section trays, hero block (12px compact)",
    },
    { key: "full", label: "radii.full", note: "Badges, avatars, switches (pill)" },
  ];

  const radiusCards = radiusItems
    .map((item) => {
      const val = `${native.radii[item.key]}px`;
      const demoRadius = item.key === "full" ? "9999px" : val;
      return `<div class="card">
        <div class="radius-demo num" style="border-radius:${demoRadius}" data-path="${item.label}" data-value="${val}">${val}</div>
        <div><code>${item.label}</code></div>
        <p class="swatch-note">${item.note}</p>
      </div>`;
    })
    .join("");

  const shadowKeys: ReadonlyArray<{ key: keyof typeof native.light.shadows; note: string }> = [
    { key: "xs", note: "Faint lift for small parts such as the active tab thumb" },
    { key: "card", note: "Level 1: cards, KPI cards, tables (paired with 1px border)" },
    { key: "raised", note: "Level 2: card on hover or drag; sticky bars" },
    { key: "overlay", note: "Level 3: dialogs, sheets, menus, popovers, toasts" },
    { key: "focus", note: "Two-ring focus halo on surface.card" },
    { key: "glass", note: "Glass card material elevation" },
    { key: "paper", note: "Paper document material elevation" },
  ];

  const zRows = Object.entries(native.zIndex).map(([key, val]) =>
    renderTokenRow(`zIndex.${key}`, String(val), "Stacking layer"),
  );

  return `<section class="chapter" id="layout-radius-elevation">
    <div class="chapter-head">
      <span class="chapter-kicker">Chapter 06</span>
      <h2 class="chapter-title">Layout, radius and elevation</h2>
    </div>

    <p class="prose">
      Spacing follows a 4px scale with one exception: the 36px gap between page sections. Every app page renders through <code>PageBody</code> in one order: <code>PageHeader</code>, <code>HeroFigure</code>, <code>KpiStrip</code>, "Your details", <code>ScenarioZone</code>, drawers.
    </p>

    ${spacingBlocks(tokens)}

    <h3 class="sub-title">Page geometry, density and breakpoints</h3>
    <div class="table-wrap">
      <table>
        <thead><tr><th scope="col">Token</th><th scope="col">Value</th><th scope="col">Role</th></tr></thead>
        <tbody>
          ${spacingRows.map(([k, v, n]) => renderTokenRow(k, v, n)).join("")}
          ${sizeRows.map(([k, v, n]) => renderTokenRow(k, v, n)).join("")}
          ${breakpointRows.map(([k, v, n]) => renderTokenRow(k, v, n)).join("")}
        </tbody>
      </table>
    </div>

    <h3 class="sub-title">Radii (Rule R1: a nested shape has a smaller radius than its container)</h3>
    <div class="grid-3">
      ${radiusCards}
    </div>

    <h3 class="sub-title">Elevation and shadows</h3>
    <p class="prose">
      Light mode shadows use deep-green ink (<code>rgba(15, 42, 42, a)</code>), never grey-blue. Dark mode elevates through lighter stepped surfaces plus a top inset hairline and 1px ring.
    </p>
    <div class="grid-2">
      ${shadowKeys.map((item) => renderShadowSpecimen(tokens, item.key, item.note)).join("")}
    </div>

    <h3 class="sub-title">Stacking order (z-index)</h3>
    <div class="table-wrap">
      <table>
        <thead><tr><th scope="col">Token</th><th scope="col">Value</th><th scope="col">Layer</th></tr></thead>
        <tbody>${zRows.join("")}</tbody>
      </table>
    </div>

    ${renderSourceCite("STYLE-GUIDE 4, 5, 6; packages/tokens/src/index.ts, layout.ts, elevation.ts, breakpoints.ts")}
  </section>`;
}
