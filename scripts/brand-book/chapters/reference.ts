import type { ColorKey, ShadowKey } from "../../../packages/tokens/src/native.generated";
import {
  renderChapterOpener,
  renderColorSwatch,
  renderMotionTokenItem,
  renderProvenanceComment,
  renderRadiusTokenItem,
  renderRulerTokenItem,
  renderShadowSpecimen,
  renderZIndexTokenItem,
} from "../renderHelpers";
import type { BrandTokens } from "../tokens";

function renderRefSection(title: string, summaryMeta: string, bodyHtml: string): string {
  return `<details class="ref-section">
    <summary class="ref-summary">
      <span>${title}</span>
      <span class="ref-summary-meta">${summaryMeta}</span>
    </summary>
    <div class="ref-body">
      ${bodyHtml}
    </div>
  </details>`;
}

function renderSwatchSection(
  tokens: BrandTokens,
  heading: string,
  entries: ReadonlyArray<readonly [ColorKey, string]>,
): string {
  const chips = entries.map(([key, note]) => renderColorSwatch(tokens, key, note)).join("");
  return renderRefSection(
    heading,
    `${entries.length} tokens`,
    `<div class="swatch-grid">${chips}</div>`,
  );
}

function parsePx(val: string): number {
  const num = Number.parseFloat(val);
  return Number.isFinite(num) ? num : 0;
}

function parseMs(val: string): number {
  if (val.endsWith("ms")) return Number.parseFloat(val);
  if (val.endsWith("s")) return Number.parseFloat(val) * 1000;
  return 0;
}

export function renderReferenceAppendix(tokens: BrandTokens): string {
  const { native, authored } = tokens;

  const logoEntries: ReadonlyArray<readonly [ColorKey, string]> = [
    ["logo.teal", "Main front bubble body and dark floor pool"],
    ["logo.sky", "Middle right bubble body"],
    ["logo.violet", "Upper back bubble body and rim light on sky and teal"],
    ["logo.rose", "Rim light on the upper violet bubble"],
    ["logo.glint", "Top sheen and crisp specular glint in both themes"],
    ["logo.backing", "Glass backing behind each bubble tint"],
    ["logo.shadow", "Floor shadow beneath the three bubbles"],
  ];

  const orbEntries: ReadonlyArray<readonly [ColorKey, string]> = [
    ["orb.skyTeal.core", "Sky and teal orb primary tone"],
    ["orb.skyTeal.shade", "Sky and teal orb secondary tone"],
    ["orb.skyTeal.bubble", "Sky and teal bubble lit fill"],
    ["orb.skyTeal.bubbleShade", "Sky and teal bubble far fill"],
    ["orb.skyTeal.rim", "Sky and teal bubble translucent edge"],
    ["orb.violetRose.core", "Violet and rose orb primary tone"],
    ["orb.violetRose.shade", "Violet and rose orb secondary tone"],
    ["orb.violetRose.bubble", "Violet and rose bubble lit fill"],
    ["orb.violetRose.bubbleShade", "Violet and rose bubble far fill"],
    ["orb.violetRose.rim", "Violet and rose bubble translucent edge"],
  ];

  const surfaceEntries: ReadonlyArray<readonly [ColorKey, string]> = [
    ["surface.canvas", "Page background (Mint light, Midnight charcoal dark)"],
    ["surface.card", "Cards, tables, drawers and marketing bands"],
    ["surface.subtle", "Hover fills and quiet recessed cards"],
    ["surface.sunken", "Wells and input tracks"],
    ["surface.overlay", "Dialogs, sheets, menus and popovers"],
    ["surface.contrast", "Charcoal footer and small numbered markers"],
    ["surface.hero", "Headline block: solid mint in light, edged card in dark"],
    ["surface.scrim", "Backdrop behind dialogs and sheets"],
  ];

  const tintEntries: ReadonlyArray<readonly [ColorKey, string]> = [
    ["surface.tint.teal", "Net worth and mortgage icon tiles"],
    ["surface.tint.sage", "Savings icon tiles"],
    ["surface.tint.apricot", "Debt icon tiles"],
    ["surface.tint.sky", "Pension icon tiles"],
    ["surface.tint.violet", "Self Assessment and tax icon tiles"],
    ["surface.tint.rose", "Budget and pay icon tiles"],
  ];

  const textEntries: ReadonlyArray<readonly [ColorKey, string]> = [
    ["text.primary", "Body copy and primary headings"],
    ["text.secondary", "Supporting text and secondary labels"],
    ["text.muted", 'Quiet text, hints and "Not set" figures'],
    ["text.onContrast", "Text on dark contrast surfaces"],
    ["text.onHero", "Labels and supporting lines on headline panels"],
    ["text.heroFigure", "Headline figure on headline panels"],
  ];

  const primaryAccentEntries: ReadonlyArray<readonly [ColorKey, string]> = [
    ["primary", "Links, outline buttons, focus ring, selected state and icons"],
    ["primary.emphasis", "Link and outline button hover"],
    ["primary.solid", "Primary button fill behind foreground ink"],
    ["primary.hover", "Primary solid button hover fill"],
    ["primary.foreground", "Text on primary solid buttons"],
    ["primary.mark", "Brand mark lit from above (statement letterhead)"],
    ["primary.markLit", "Top highlight for brand mark"],
    ["primary.subtle", "Selected nav item, quiet accent fills and mint document cards"],
    ["primary.border", "Selected or hovered edge on subtle primary fills"],
    ["accent", "Icons, shapes, lines and text on cards and accent panels"],
    ["accent.subtle", "The one tinted section or card on a page"],
    ["accent.border", "Decorative edge of subtle accent fills"],
    ["accent.onHero", "Reserved accent shape on headline panels"],
  ];

  const borderEntries: ReadonlyArray<readonly [ColorKey, string]> = [
    ["border", "Default card hairline"],
    ["border.subtle", "Quiet dividers"],
    ["border.strong", "Control boundaries and outline buttons"],
    ["border.input", "Form inputs and dashed modelling zone edge"],
    ["border.focusRing", "2px keyboard focus outline with 2px offset"],
    ["border.hero", "Edge of headline panel"],
    ["border.section", "Dark rule under an app section title"],
  ];

  const statusEntries: ReadonlyArray<readonly [ColorKey, string]> = [
    ["status.positive.text", "Positive badge text"],
    ["status.positive.bg", "Positive badge fill"],
    ["status.positive.border", "Positive badge edge"],
    ["status.positive.solid", "Positive solid fill"],
    ["status.warning.text", "Warning badge text (deadlines and unverified tax)"],
    ["status.warning.bg", "Warning badge fill"],
    ["status.warning.border", "Warning badge edge"],
    ["status.warning.solid", "Warning solid fill (dark ink only in light)"],
    ["status.danger.text", "Error and destructive text (never for debt)"],
    ["status.danger.bg", "Error and destructive fill"],
    ["status.danger.border", "Error and destructive edge"],
    ["status.danger.solid", "Destructive confirm button fill"],
    ["status.info.text", "Actionable info text"],
    ["status.info.bg", "Info fill"],
    ["status.info.border", "Info edge"],
    ["status.info.solid", "Info solid fill"],
    ["status.neutral.text", "Neutral label text (Saved, Illustration)"],
    ["status.neutral.bg", "Neutral label fill"],
    ["status.neutral.border", "Neutral label edge"],
    ["status.neutral.solid", "Neutral solid fill"],
  ];

  const materialEntries: ReadonlyArray<readonly [ColorKey, string]> = [
    ["material.glass.fill", "Glass card base fill"],
    ["material.glass.border", "Glass card edge"],
    ["material.glass.light", "Inner top highlight"],
    ["material.glass.sheen", "155 degree diagonal sheen"],
    ["material.paper.fill", "Paper document base fill"],
    ["material.paper.edge", "Paper document 1px edge"],
    ["material.paper.rule", "4px horizontal paper ruling"],
  ];

  const chartEntries: ReadonlyArray<readonly [ColorKey, string]> = [
    ["chart.primary", "Main line: net worth, mortgage and pension"],
    ["chart.wealth", "Savings"],
    ["chart.debt", "What you owe (apricot, never red)"],
    ["chart.warning", "Chart warning series (ochre)"],
    ["chart.accentPurple", "Accent purple series"],
    ["chart.accentCyan", "Accent cyan series"],
    ["chart.accent", "Directly labelled accent series"],
    ["chart.series1", "Entity series 1 (teal)"],
    ["chart.series2", "Entity series 2 (sage)"],
    ["chart.series3", "Entity series 3 (apricot)"],
    ["chart.series4", "Entity series 4 (violet)"],
    ["chart.series5", "Entity series 5 (rose)"],
    ["chart.series6", "Entity series 6 (sky)"],
    ["chart.series7", "Entity series 7 (olive-gold)"],
    ["chart.series8", "Entity series 8 (slate-grey)"],
    ["chart.projection", "Estimate lines (always dashed)"],
    ["chart.band", "Range fill behind an estimate line"],
    ["chart.baseline", "Zero line, targets and reference lines"],
    ["chart.grid", "Gridlines"],
  ];

  const typeRows: ReadonlyArray<{
    token: string;
    family: string;
    fontCss: string;
    sizeCss: string;
    sizeLabel: string;
    weight: string;
    lh: string;
    use: string;
    sample: string;
    tabular?: boolean;
  }> = [
    {
      token: "display",
      family: "Plus Jakarta Sans",
      fontCss: "var(--font-heading)",
      sizeCss: authored.webTextStyles.display.value.fontSize,
      sizeLabel: `${native.textStyles.display.fontSize.min} to ${native.textStyles.display.fontSize.max}px`,
      weight: authored.webTextStyles.display.value.fontWeight,
      lh: authored.webTextStyles.display.value.lineHeight,
      use: "Marketing hero headline",
      sample: "All your money. One clear picture.",
    },
    {
      token: "numeric.hero",
      family: "Inter (tabular)",
      fontCss: "var(--font-body)",
      sizeCss: authored.webTextStyles.numeric.hero.value.fontSize,
      sizeLabel: `${native.textStyles["numeric.hero"].fontSize.min} to ${native.textStyles["numeric.hero"].fontSize.max}px`,
      weight: authored.webTextStyles.numeric.hero.value.fontWeight,
      lh: authored.webTextStyles.numeric.hero.value.lineHeight,
      use: "Headline figure",
      sample: "£231,400",
      tabular: true,
    },
    {
      token: "numeric.result",
      family: "Inter (tabular)",
      fontCss: "var(--font-body)",
      sizeCss: authored.webTextStyles.numeric.result.value.fontSize,
      sizeLabel: `${native.textStyles["numeric.result"].fontSize}px`,
      weight: authored.webTextStyles.numeric.result.value.fontWeight,
      lh: authored.webTextStyles.numeric.result.value.lineHeight,
      use: "Result block figure",
      sample: "£21,000",
      tabular: true,
    },
    {
      token: "heading.xl",
      family: "Plus Jakarta Sans",
      fontCss: "var(--font-heading)",
      sizeCss: authored.webTextStyles.heading.xl.value.fontSize,
      sizeLabel: `${native.textStyles["heading.xl"].fontSize.min} to ${native.textStyles["heading.xl"].fontSize.max}px`,
      weight: authored.webTextStyles.heading.xl.value.fontWeight,
      lh: authored.webTextStyles.heading.xl.value.lineHeight,
      use: "Page title",
      sample: "Your mortgage",
    },
    {
      token: "numeric.kpi",
      family: "Inter (tabular)",
      fontCss: "var(--font-body)",
      sizeCss: authored.webTextStyles.numeric.kpi.value.fontSize,
      sizeLabel: `${native.textStyles["numeric.kpi"].fontSize}px`,
      weight: authored.webTextStyles.numeric.kpi.value.fontWeight,
      lh: authored.webTextStyles.numeric.kpi.value.lineHeight,
      use: "KPI card values",
      sample: "£9,600",
      tabular: true,
    },
    {
      token: "heading.lg",
      family: "Plus Jakarta Sans",
      fontCss: "var(--font-heading)",
      sizeCss: authored.webTextStyles.heading.lg.value.fontSize,
      sizeLabel: `${native.textStyles["heading.lg"].fontSize}px`,
      weight: authored.webTextStyles.heading.lg.value.fontWeight,
      lh: authored.webTextStyles.heading.lg.value.lineHeight,
      use: "Section title",
      sample: "Cash and savings",
    },
    {
      token: "numeric.lg",
      family: "Inter (tabular)",
      fontCss: "var(--font-body)",
      sizeCss: authored.webTextStyles.numeric.lg.value.fontSize,
      sizeLabel: `${native.textStyles["numeric.lg"].fontSize}px`,
      weight: authored.webTextStyles.numeric.lg.value.fontWeight,
      lh: authored.webTextStyles.numeric.lg.value.lineHeight,
      use: "Larger card figures",
      sample: "£3,450",
      tabular: true,
    },
    {
      token: "heading.md",
      family: "Plus Jakarta Sans",
      fontCss: "var(--font-heading)",
      sizeCss: authored.webTextStyles.heading.md.value.fontSize,
      sizeLabel: `${native.textStyles["heading.md"].fontSize}px`,
      weight: authored.webTextStyles.heading.md.value.fontWeight,
      lh: authored.webTextStyles.heading.md.value.lineHeight,
      use: "Card title",
      sample: "Workplace pension",
    },
    {
      token: "body.lg",
      family: "Inter",
      fontCss: "var(--font-body)",
      sizeCss: authored.webTextStyles.body.lg.value.fontSize,
      sizeLabel: `${native.textStyles["body.lg"].fontSize}px`,
      weight: authored.webTextStyles.body.lg.value.fontWeight,
      lh: authored.webTextStyles.body.lg.value.lineHeight,
      use: "Lead paragraph",
      sample: "Accounts, budget, pay, savings, pension and debts in one place.",
    },
    {
      token: "heading.sm",
      family: "Plus Jakarta Sans",
      fontCss: "var(--font-heading)",
      sizeCss: authored.webTextStyles.heading.sm.value.fontSize,
      sizeLabel: `${native.textStyles["heading.sm"].fontSize}px`,
      weight: authored.webTextStyles.heading.sm.value.fontWeight,
      lh: authored.webTextStyles.heading.sm.value.lineHeight,
      use: "Group title inside a card",
      sample: "Monthly bills",
    },
    {
      token: "body.md",
      family: "Inter",
      fontCss: "var(--font-body)",
      sizeCss: authored.webTextStyles.body.md.value.fontSize,
      sizeLabel: `${native.textStyles["body.md"].fontSize}px`,
      weight: authored.webTextStyles.body.md.value.fontWeight,
      lh: authored.webTextStyles.body.md.value.lineHeight,
      use: "Default body text",
      sample: "Add your first account to see your monthly picture.",
    },
    {
      token: "numeric.md",
      family: "Inter (tabular)",
      fontCss: "var(--font-body)",
      sizeCss: authored.webTextStyles.numeric.md.value.fontSize,
      sizeLabel: `${native.textStyles["numeric.md"].fontSize}px`,
      weight: authored.webTextStyles.numeric.md.value.fontWeight,
      lh: authored.webTextStyles.numeric.md.value.lineHeight,
      use: "Row and table figures",
      sample: "£628",
      tabular: true,
    },
    {
      token: "numeric.unset",
      family: "Inter (tabular)",
      fontCss: "var(--font-body)",
      sizeCss: authored.webTextStyles.numeric.unset.value.fontSize,
      sizeLabel: `${native.textStyles["numeric.unset"].fontSize}px`,
      weight: authored.webTextStyles.numeric.unset.value.fontWeight,
      lh: authored.webTextStyles.numeric.unset.value.lineHeight,
      use: '"Not set" state',
      sample: "Not set",
      tabular: true,
    },
    {
      token: "body.sm",
      family: "Inter",
      fontCss: "var(--font-body)",
      sizeCss: authored.webTextStyles.body.sm.value.fontSize,
      sizeLabel: `${native.textStyles["body.sm"].fontSize}px`,
      weight: authored.webTextStyles.body.sm.value.fontWeight,
      lh: authored.webTextStyles.body.sm.value.lineHeight,
      use: "Supporting text and notices",
      sample: "Last check-in: October 2026.",
    },
    {
      token: "label.md",
      family: "Inter",
      fontCss: "var(--font-body)",
      sizeCss: authored.webTextStyles.label.md.value.fontSize,
      sizeLabel: `${native.textStyles["label.md"].fontSize}px`,
      weight: authored.webTextStyles.label.md.value.fontWeight,
      lh: authored.webTextStyles.label.md.value.lineHeight,
      use: "Form labels and buttons",
      sample: "Yearly salary before tax",
    },
    {
      token: "numeric.sm",
      family: "Inter (tabular)",
      fontCss: "var(--font-body)",
      sizeCss: authored.webTextStyles.numeric.sm.value.fontSize,
      sizeLabel: `${native.textStyles["numeric.sm"].fontSize}px`,
      weight: authored.webTextStyles.numeric.sm.value.fontWeight,
      lh: authored.webTextStyles.numeric.sm.value.lineHeight,
      use: "Axis ticks and tooltips",
      sample: "3.5% AER",
      tabular: true,
    },
    {
      token: "label.sm",
      family: "Inter",
      fontCss: "var(--font-body)",
      sizeCss: authored.webTextStyles.label.sm.value.fontSize,
      sizeLabel: `${native.textStyles["label.sm"].fontSize}px`,
      weight: authored.webTextStyles.label.sm.value.fontWeight,
      lh: authored.webTextStyles.label.sm.value.lineHeight,
      use: "KPI labels and table headers (12px floor)",
      sample: "Breathing room",
    },
  ];

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
    [
      "spacing.page.top.sm",
      `${native.spacing["page.top.sm"]}px`,
      "App header to page title on phones",
    ],
    [
      "spacing.page.top.lg",
      `${native.spacing["page.top.lg"]}px`,
      "App header to page title from 1024px",
    ],
    ["spacing.page.section", `${native.spacing["page.section"]}px`, "Gap between page sections"],
    [
      "spacing.density.cardPad",
      `${native.spacing["density.cardPad"]}px`,
      "Card padding (14px compact)",
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
    ["sizes.page.max", `${native.sizes["page.max"]}px`, "Maximum content width"],
    ["sizes.touch", `${native.sizes.touch}px`, "Minimum touch target (never shrinks in compact)"],
    ["sizes.control.sm", `${native.sizes["control.sm"]}px`, "Small control height (28px compact)"],
    [
      "sizes.control.md",
      `${native.sizes["control.md"]}px`,
      "Default control height (32px compact)",
    ],
    ["sizes.control.lg", `${native.sizes["control.lg"]}px`, "Large control height (40px compact)"],
    ["breakpoints.sm", `${native.breakpoints.sm}px`, "Small landscape and large phone"],
    ["breakpoints.md", `${native.breakpoints.md}px`, "Switches phone drawer to compact top bar"],
    ["breakpoints.lg", `${native.breakpoints.lg}px`, "Full top bar and desktop split layout"],
    ["breakpoints.xl", `${native.breakpoints.xl}px`, "Desktop reference viewport"],
    ["breakpoints.2xl", `${native.breakpoints["2xl"]}px`, "Wide desktop"],
  ] as const;

  const spacingScaleHtml = spacingRows
    .map(([k, v, n]) => {
      const px = parsePx(v);
      const maxForKind = k.startsWith("breakpoints.") ? 1536 : k === "sizes.page.max" ? 1280 : 64;
      const pct = Math.min(100, (px / maxForKind) * 100);
      return renderRulerTokenItem(k, v, n, pct);
    })
    .join("");

  const radiusRows: ReadonlyArray<readonly [string, string, string]> = [
    ["radii.none", `${native.radii.none}px`, "Square edges"],
    ["radii.xs", `${native.radii.xs}px`, "Tags inside dense tables"],
    ["radii.sm", `${native.radii.sm}px`, "Small controls (4px compact)"],
    [
      "radii.control",
      `${native.radii.control}px`,
      "Buttons, inputs and slider readouts (6px compact)",
    ],
    ["radii.lg", `${native.radii.lg}px`, "Selected tab thumb and icon tiles (8px compact)"],
    ["radii.card", `${native.radii.card}px`, "Cards, KPI cards, tables and drawers (8px compact)"],
    [
      "radii.tray",
      `${native.radii.tray}px`,
      "Dialogs, sheets, trays and headline block (12px compact)",
    ],
    ["radii.full", `${native.radii.full}px`, "Badges, avatars and switches (pill)"],
  ];

  const radiusVisualHtml = radiusRows
    .map(([k, v, n]) => renderRadiusTokenItem(k, v, n, k === "radii.full" ? "9999px" : v))
    .join("");

  const zEntries = Object.entries(native.zIndex);
  const zScaleHtml = zEntries
    .map(([key, val], idx) =>
      renderZIndexTokenItem(`zIndex.${key}`, String(val), "Stacking layer", idx, zEntries.length),
    )
    .join("");

  const shadowKeys: ReadonlyArray<{ key: ShadowKey; note: string }> = [
    { key: "xs", note: "Faint lift for small parts such as the active tab thumb" },
    { key: "card", note: "Level 1: cards, KPI cards and tables (paired with 1px border)" },
    { key: "raised", note: "Level 2: card on hover or drag, and sticky bars" },
    { key: "overlay", note: "Level 3: dialogs, sheets, menus, popovers and toasts" },
    { key: "focus", note: "Two-ring focus halo on cards" },
    { key: "glass", note: "Glass card material elevation" },
    { key: "paper", note: "Paper document material elevation" },
  ];

  const appDurationNotes: Record<string, string> = {
    instant: "Immediate state swap (reduced motion)",
    fast: "Hover, press and scenario result changing",
    base: "Tabs, disclosures and toasts",
    slow: "Sheets, dialogs and onboarding step cap",
    loop: "One turn of a continuous loading spinner",
    reveal: "Content fade-in after a shown placeholder",
    pendingDelay: "No loading indicator shown before this delay",
    pendingMinimum: "Minimum time a shown loading indicator stays visible",
    draw: "A line or tick drawing itself in once",
    scene: "An illustration settling on first view; saved figure wash",
  };

  const appEasingNotes: Record<string, string> = {
    standard: "Moving within the screen",
    enter: "Arriving on screen",
    exit: "Leaving the screen",
    settle: "Soft landing with no overshoot for scene motion",
  };

  const marketingDurationNotes: Record<string, string> = {
    glide: "Pay rise tool result gliding to its new value",
    hover: "Hover light, tilt settle and colour changes",
    stagger: "Gap between neighbours arriving",
    disclosure: "FAQ or extra detail opening or closing",
    entry: "One card, tag or line arriving",
    count: "Sample figure tagged Example counting once",
    chart: "Chart line drawing itself once",
    hero: "Full timed hero sequence",
  };

  const marketingEasingNotes: Record<string, string> = {
    calm: "Arriving, opening and gliding (no overshoot)",
    calmInOut: "Travel and disclosure height (no overshoot)",
  };

  const durationItems = [
    ...Object.entries(authored.primitiveDurations).map(([key, token]) =>
      renderMotionTokenItem(
        `durations.${key}`,
        token.value,
        appDurationNotes[key] ?? "App timing",
        (parseMs(token.value) / 2400) * 100,
      ),
    ),
    ...Object.entries(authored.marketingDurations).map(([key, token]) =>
      renderMotionTokenItem(
        `durations.marketing.${key}`,
        token.value,
        marketingDurationNotes[key] ?? "Marketing calm scale",
        (parseMs(token.value) / 2400) * 100,
      ),
    ),
  ];

  const easingItems = [
    ...Object.entries(authored.primitiveEasings).map(([key, token]) =>
      renderMotionTokenItem(`easings.${key}`, token.value, appEasingNotes[key] ?? "App easing"),
    ),
    ...Object.entries(authored.marketingEasings).map(([key, token]) =>
      renderMotionTokenItem(
        `easings.marketing.${key}`,
        token.value,
        marketingEasingNotes[key] ?? "Marketing easing",
      ),
    ),
  ];

  const typeVisualHtml = `<div class="ref-type-list">
    ${typeRows
      .map(
        (item) => `<div class="ref-type-row">
          <div class="type-meta">
            <code>${item.token}</code>
            <span>${item.family}</span>
            <span class="num">${item.sizeLabel}</span>
            <span class="num">weight ${item.weight}</span>
            <span class="num">line height ${item.lh}</span>
            <span>${item.use}</span>
          </div>
          <div style="font-family:${item.fontCss};font-size:${item.sizeCss};font-weight:${item.weight};line-height:${item.lh};color:var(--color-text-primary);${item.tabular ? "font-variant-numeric:tabular-nums;" : ""}">${item.sample}</div>
        </div>`,
      )
      .join("")}
  </div>`;

  const openerVisual = `<div class="opener-visual-plate">
    <p class="chapter-kicker">Token specification</p>
    <p class="prose">
      Every colour, size, radius, shadow and timing below is read straight from the system token sources. Open any group to inspect exact values for light and dark themes.
    </p>
  </div>`;

  return `<section class="chapter" id="reference">
    ${renderChapterOpener({
      num: "Ref",
      title: "Reference",
      lead: "Complete design token names and resolved light and dark values, collapsed by topic with visual scales.",
      visualHtml: openerVisual,
      surface: "card",
    })}

    <div class="spread">
      <div class="spread-inner">
        <div class="ref-stack">
          ${renderSwatchSection(tokens, "Logo colour tokens", logoEntries)}
          ${renderSwatchSection(tokens, "Marketing orb colour tokens", orbEntries)}
          ${renderSwatchSection(tokens, "Surface colour tokens", surfaceEntries)}
          ${renderSwatchSection(tokens, "Domain surface tint tokens", tintEntries)}
          ${renderSwatchSection(tokens, "Text colour tokens", textEntries)}
          ${renderSwatchSection(tokens, "Primary and accent colour tokens", primaryAccentEntries)}
          ${renderSwatchSection(tokens, "Border colour tokens", borderEntries)}
          ${renderSwatchSection(tokens, "Status colour tokens", statusEntries)}
          ${renderSwatchSection(tokens, "Material colour tokens", materialEntries)}
          ${renderSwatchSection(tokens, "Chart colour tokens", chartEntries)}
          ${renderRefSection("Type scale", `${typeRows.length} styles`, typeVisualHtml)}
          ${renderRefSection("Spacing, sizes and breakpoints", `${spacingRows.length} tokens`, `<div class="ref-scale-grid">${spacingScaleHtml}</div>`)}
          ${renderRefSection("Corner radii", `${radiusRows.length} radii`, `<div class="ref-scale-grid">${radiusVisualHtml}</div>`)}
          ${renderRefSection("Stacking order", `${zEntries.length} layers`, `<div class="ref-scale-grid">${zScaleHtml}</div>`)}
          ${renderRefSection("Elevation and shadows", `${shadowKeys.length} shadows`, `<div class="grid-2">${shadowKeys.map((item) => renderShadowSpecimen(tokens, item.key, item.note)).join("")}</div>`)}
          ${renderRefSection("Motion durations and easings", `${durationItems.length + easingItems.length} tokens`, `<div class="ref-scale-grid">${durationItems.join("")}${easingItems.join("")}</div>`)}
        </div>
      </div>
    </div>

    ${renderProvenanceComment("packages/tokens/src/index.ts, typography.ts, layout.ts, elevation.ts, motion.ts, breakpoints.ts, native.generated.ts")}
  </section>`;
}
