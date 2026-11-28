import type { ColorKey, ShadowKey } from "../../../packages/tokens/src/native.generated";
import {
  renderColorSwatch,
  renderProvenanceComment,
  renderShadowSpecimen,
  renderTokenRow,
} from "../renderHelpers";
import type { BrandTokens } from "../tokens";

function renderSwatchGroup(
  tokens: BrandTokens,
  heading: string,
  entries: ReadonlyArray<readonly [ColorKey, string]>,
): string {
  return `<div class="reference-group">
    <h3 class="sub-title">${heading}</h3>
    <div class="swatch-grid">
      ${entries.map(([key, note]) => renderColorSwatch(tokens, key, note)).join("")}
    </div>
  </div>`;
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

  const typeRows: ReadonlyArray<readonly [string, string, string, string, string, string]> = [
    [
      "display",
      "Plus Jakarta Sans",
      `${native.textStyles.display.fontSize.min} to ${native.textStyles.display.fontSize.max}px`,
      authored.webTextStyles.display.value.fontWeight,
      authored.webTextStyles.display.value.lineHeight,
      "Marketing hero headline",
    ],
    [
      "numeric.hero",
      "Inter (tabular)",
      `${native.textStyles["numeric.hero"].fontSize.min} to ${native.textStyles["numeric.hero"].fontSize.max}px`,
      authored.webTextStyles.numeric.hero.value.fontWeight,
      authored.webTextStyles.numeric.hero.value.lineHeight,
      "Headline figure",
    ],
    [
      "numeric.result",
      "Inter (tabular)",
      `${native.textStyles["numeric.result"].fontSize}px`,
      authored.webTextStyles.numeric.result.value.fontWeight,
      authored.webTextStyles.numeric.result.value.lineHeight,
      "Result block figure",
    ],
    [
      "heading.xl",
      "Plus Jakarta Sans",
      `${native.textStyles["heading.xl"].fontSize.min} to ${native.textStyles["heading.xl"].fontSize.max}px`,
      authored.webTextStyles.heading.xl.value.fontWeight,
      authored.webTextStyles.heading.xl.value.lineHeight,
      "Page title",
    ],
    [
      "numeric.kpi",
      "Inter (tabular)",
      `${native.textStyles["numeric.kpi"].fontSize}px`,
      authored.webTextStyles.numeric.kpi.value.fontWeight,
      authored.webTextStyles.numeric.kpi.value.lineHeight,
      "KPI card values",
    ],
    [
      "heading.lg",
      "Plus Jakarta Sans",
      `${native.textStyles["heading.lg"].fontSize}px`,
      authored.webTextStyles.heading.lg.value.fontWeight,
      authored.webTextStyles.heading.lg.value.lineHeight,
      "Section title",
    ],
    [
      "numeric.lg",
      "Inter (tabular)",
      `${native.textStyles["numeric.lg"].fontSize}px`,
      authored.webTextStyles.numeric.lg.value.fontWeight,
      authored.webTextStyles.numeric.lg.value.lineHeight,
      "Larger card figures",
    ],
    [
      "heading.md",
      "Plus Jakarta Sans",
      `${native.textStyles["heading.md"].fontSize}px`,
      authored.webTextStyles.heading.md.value.fontWeight,
      authored.webTextStyles.heading.md.value.lineHeight,
      "Card title",
    ],
    [
      "body.lg",
      "Inter",
      `${native.textStyles["body.lg"].fontSize}px`,
      authored.webTextStyles.body.lg.value.fontWeight,
      authored.webTextStyles.body.lg.value.lineHeight,
      "Lead paragraph",
    ],
    [
      "heading.sm",
      "Plus Jakarta Sans",
      `${native.textStyles["heading.sm"].fontSize}px`,
      authored.webTextStyles.heading.sm.value.fontWeight,
      authored.webTextStyles.heading.sm.value.lineHeight,
      "Group title inside a card",
    ],
    [
      "body.md",
      "Inter",
      `${native.textStyles["body.md"].fontSize}px`,
      authored.webTextStyles.body.md.value.fontWeight,
      authored.webTextStyles.body.md.value.lineHeight,
      "Default body text",
    ],
    [
      "numeric.md",
      "Inter (tabular)",
      `${native.textStyles["numeric.md"].fontSize}px`,
      authored.webTextStyles.numeric.md.value.fontWeight,
      authored.webTextStyles.numeric.md.value.lineHeight,
      "Row and table figures",
    ],
    [
      "numeric.unset",
      "Inter (tabular)",
      `${native.textStyles["numeric.unset"].fontSize}px`,
      authored.webTextStyles.numeric.unset.value.fontWeight,
      authored.webTextStyles.numeric.unset.value.lineHeight,
      '"Not set" state',
    ],
    [
      "body.sm",
      "Inter",
      `${native.textStyles["body.sm"].fontSize}px`,
      authored.webTextStyles.body.sm.value.fontWeight,
      authored.webTextStyles.body.sm.value.lineHeight,
      "Supporting text and notices",
    ],
    [
      "label.md",
      "Inter",
      `${native.textStyles["label.md"].fontSize}px`,
      authored.webTextStyles.label.md.value.fontWeight,
      authored.webTextStyles.label.md.value.lineHeight,
      "Form labels and buttons",
    ],
    [
      "numeric.sm",
      "Inter (tabular)",
      `${native.textStyles["numeric.sm"].fontSize}px`,
      authored.webTextStyles.numeric.sm.value.fontWeight,
      authored.webTextStyles.numeric.sm.value.lineHeight,
      "Axis ticks and tooltips",
    ],
    [
      "label.sm",
      "Inter",
      `${native.textStyles["label.sm"].fontSize}px`,
      authored.webTextStyles.label.sm.value.fontWeight,
      authored.webTextStyles.label.sm.value.lineHeight,
      "KPI labels and table headers (12px floor)",
    ],
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

  const shadowKeys: ReadonlyArray<{ key: ShadowKey; note: string }> = [
    { key: "xs", note: "Faint lift for small parts such as the active tab thumb" },
    { key: "card", note: "Level 1: cards, KPI cards and tables (paired with 1px border)" },
    { key: "raised", note: "Level 2: card on hover or drag, and sticky bars" },
    { key: "overlay", note: "Level 3: dialogs, sheets, menus, popovers and toasts" },
    { key: "focus", note: "Two-ring focus halo on cards" },
    { key: "glass", note: "Glass card material elevation" },
    { key: "paper", note: "Paper document material elevation" },
  ];

  const zRows = Object.entries(native.zIndex).map(([key, val]) =>
    renderTokenRow(`zIndex.${key}`, String(val), "Stacking layer"),
  );

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

  const motionRows = [
    ...Object.entries(authored.primitiveDurations).map(([key, token]) =>
      renderTokenRow(`durations.${key}`, token.value, appDurationNotes[key] ?? "App timing"),
    ),
    ...Object.entries(authored.primitiveEasings).map(([key, token]) =>
      renderTokenRow(`easings.${key}`, token.value, appEasingNotes[key] ?? "App easing"),
    ),
    ...Object.entries(authored.marketingDurations).map(([key, token]) =>
      renderTokenRow(
        `durations.marketing.${key}`,
        token.value,
        marketingDurationNotes[key] ?? "Marketing calm scale",
      ),
    ),
    ...Object.entries(authored.marketingEasings).map(([key, token]) =>
      renderTokenRow(
        `easings.marketing.${key}`,
        token.value,
        marketingEasingNotes[key] ?? "Marketing easing",
      ),
    ),
  ];

  return `<section class="chapter" id="reference">
    <div class="chapter-head">
      <span class="chapter-kicker">Appendix</span>
      <h2 class="chapter-title">Reference</h2>
    </div>

    <p class="prose">
      Complete design token names and resolved light and dark values read from the system token definitions, grouped by topic for engineers and designers implementing Flump screens.
    </p>

    ${renderSwatchGroup(tokens, "Logo colour tokens", logoEntries)}
    ${renderSwatchGroup(tokens, "Marketing orb colour tokens", orbEntries)}
    ${renderSwatchGroup(tokens, "Surface colour tokens", surfaceEntries)}
    ${renderSwatchGroup(tokens, "Domain surface tint tokens", tintEntries)}
    ${renderSwatchGroup(tokens, "Text colour tokens", textEntries)}
    ${renderSwatchGroup(tokens, "Primary and accent colour tokens", primaryAccentEntries)}
    ${renderSwatchGroup(tokens, "Border colour tokens", borderEntries)}
    ${renderSwatchGroup(tokens, "Status colour tokens", statusEntries)}
    ${renderSwatchGroup(tokens, "Material colour tokens", materialEntries)}
    ${renderSwatchGroup(tokens, "Chart colour tokens", chartEntries)}

    <div class="reference-group">
      <h3 class="sub-title">Type scale</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Token</th>
              <th scope="col">Typeface</th>
              <th scope="col">Size</th>
              <th scope="col">Weight</th>
              <th scope="col">Line height</th>
              <th scope="col">Use</th>
            </tr>
          </thead>
          <tbody>
            ${typeRows
              .map(
                ([tok, fam, sz, wt, lh, use]) =>
                  `<tr><td><code>${tok}</code></td><td>${fam}</td><td class="num">${sz}</td><td class="num">${wt}</td><td class="num">${lh}</td><td>${use}</td></tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>

    <div class="reference-group">
      <h3 class="sub-title">Spacing, sizes and breakpoints</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th scope="col">Token</th><th scope="col">Value</th><th scope="col">Role</th></tr></thead>
          <tbody>
            ${spacingRows.map(([k, v, n]) => renderTokenRow(k, v, n)).join("")}
          </tbody>
        </table>
      </div>
    </div>

    <div class="reference-group">
      <h3 class="sub-title">Corner radii and stacking order</h3>
      <div class="grid-2">
        <div class="table-wrap">
          <table>
            <thead><tr><th scope="col">Token</th><th scope="col">Value</th><th scope="col">Role</th></tr></thead>
            <tbody>
              ${radiusRows.map(([k, v, n]) => renderTokenRow(k, v, n)).join("")}
            </tbody>
          </table>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th scope="col">Token</th><th scope="col">Value</th><th scope="col">Layer</th></tr></thead>
            <tbody>
              ${zRows.join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="reference-group">
      <h3 class="sub-title">Elevation and shadows</h3>
      <div class="grid-2">
        ${shadowKeys.map((item) => renderShadowSpecimen(tokens, item.key, item.note)).join("")}
      </div>
    </div>

    <div class="reference-group">
      <h3 class="sub-title">Motion durations and easings</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th scope="col">Token</th><th scope="col">Value</th><th scope="col">Use</th></tr></thead>
          <tbody>
            ${motionRows.join("")}
          </tbody>
        </table>
      </div>
    </div>

    ${renderProvenanceComment("packages/tokens/src/index.ts, typography.ts, layout.ts, elevation.ts, motion.ts, breakpoints.ts, native.generated.ts")}
  </section>`;
}
