import { type BrandTokens, colorVar } from "../tokens";

export function renderTypeLadderDiagram(tokens: BrandTokens): string {
  const styles = tokens.native.textStyles;
  const rows: Array<{ key: keyof typeof styles; label: string; family: "heading" | "body" }> = [
    { key: "display", label: "Display headline", family: "heading" },
    { key: "numeric.hero", label: "Headline figure", family: "body" },
    { key: "numeric.result", label: "Result figure", family: "body" },
    { key: "numeric.kpi", label: "Summary card figure", family: "body" },
    { key: "heading.xl", label: "Page title", family: "heading" },
    { key: "heading.lg", label: "Section title", family: "heading" },
    { key: "numeric.lg", label: "Large card figure", family: "body" },
    { key: "heading.md", label: "Card title", family: "heading" },
    { key: "body.lg", label: "Lead paragraph", family: "body" },
    { key: "heading.sm", label: "Group title", family: "heading" },
    { key: "body.md", label: "Body text", family: "body" },
    { key: "numeric.md", label: "Table figure", family: "body" },
    { key: "body.sm", label: "Supporting text", family: "body" },
    { key: "label.md", label: "Form label", family: "body" },
    { key: "label.sm", label: "Small label", family: "body" },
  ];

  const rowHeight = 26;
  const topPad = 42;
  const height = topPad + rows.length * rowHeight + 26;
  const maxBar = 340;
  const maxPx = 48;

  const items = rows
    .map((row, index) => {
      const entry = styles[row.key];
      const sizeObj = entry.fontSize;
      const px = typeof sizeObj === "number" ? sizeObj : sizeObj.max;
      const sizeText =
        typeof sizeObj === "number" ? `${sizeObj}px` : `${sizeObj.min} to ${sizeObj.max}px`;
      const barW = Math.round((px / maxPx) * maxBar);
      const y = topPad + index * rowHeight;
      const barCol = row.family === "heading" ? colorVar("primary") : colorVar("accent");

      return `
      <g>
        <text x="20" y="${y + 13}" fill="${colorVar("text.primary")}" font-family="var(--font-body)" font-size="11">${row.label}</text>
        <rect x="172" y="${y + 2}" width="${barW}" height="14" rx="4" fill="${barCol}" fill-opacity="0.85"/>
        <text x="${180 + barW}" y="${y + 13}" fill="${colorVar("text.secondary")}" font-family="var(--font-body)" font-size="11" style="font-variant-numeric:tabular-nums">${sizeText}, weight ${entry.fontWeight}</text>
      </g>`;
    })
    .join("");

  const floorX = 172 + Math.round((tokens.native.fontSizes.xs / maxPx) * maxBar);

  return `<figure class="diagram-figure" data-diagram="type-ladder">
    <svg viewBox="0 0 680 ${height}" role="img" aria-labelledby="diag-type-title diag-type-desc">
      <title id="diag-type-title">Flump type scale ladder</title>
      <desc id="diag-type-desc">Proportional ladder of the fifteen main text sizes from the 48 pixel display headline down to the 12 pixel minimum floor.</desc>
      <rect x="1" y="1" width="678" height="${height - 2}" rx="14" fill="${colorVar("surface.subtle")}" stroke="${colorVar("border")}"/>
      <text x="20" y="24" fill="${colorVar("text.primary")}" font-family="var(--font-heading)" font-size="12" font-weight="700">Role</text>
      <text x="172" y="24" fill="${colorVar("text.primary")}" font-family="var(--font-heading)" font-size="12" font-weight="700">Ceiling size (48px max, 12px minimum)</text>
      <line x1="${floorX}" y1="32" x2="${floorX}" y2="${height - 18}" stroke="${colorVar("border.strong")}" stroke-dasharray="3 3"/>
      <text x="${floorX}" y="${height - 6}" text-anchor="middle" fill="${colorVar("text.muted")}" font-family="var(--font-body)" font-size="10">12px floor</text>
      ${items}
    </svg>
    <figcaption class="diagram-caption">
      Proportional hierarchy across all fifteen main text roles. Plus Jakarta Sans headings are shown in teal; Inter body, label and figure styles are shown in accent.
    </figcaption>
  </figure>`;
}
