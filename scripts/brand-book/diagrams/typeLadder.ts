import { type BrandTokens, colorVar } from "../tokens";

export function renderTypeLadderDiagram(tokens: BrandTokens): string {
  const styles = tokens.native.textStyles;
  const rows: Array<{ key: keyof typeof styles; label: string; family: "heading" | "body" }> = [
    { key: "display", label: "display", family: "heading" },
    { key: "numeric.hero", label: "numeric.hero", family: "body" },
    { key: "numeric.result", label: "numeric.result", family: "body" },
    { key: "numeric.kpi", label: "numeric.kpi", family: "body" },
    { key: "heading.xl", label: "heading.xl", family: "heading" },
    { key: "heading.lg", label: "heading.lg", family: "heading" },
    { key: "numeric.lg", label: "numeric.lg", family: "body" },
    { key: "heading.md", label: "heading.md", family: "heading" },
    { key: "body.lg", label: "body.lg", family: "body" },
    { key: "heading.sm", label: "heading.sm", family: "heading" },
    { key: "body.md", label: "body.md", family: "body" },
    { key: "numeric.md", label: "numeric.md", family: "body" },
    { key: "body.sm", label: "body.sm", family: "body" },
    { key: "label.md", label: "label.md", family: "body" },
    { key: "label.sm", label: "label.sm", family: "body" },
  ];

  const rowHeight = 26;
  const topPad = 42;
  const height = topPad + rows.length * rowHeight + 24;
  const maxBar = 360;
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
        <text x="20" y="${y + 13}" fill="${colorVar("text.primary")}" font-family="var(--font-mono)" font-size="11">${row.label}</text>
        <rect x="160" y="${y + 2}" width="${barW}" height="14" rx="4" fill="${barCol}" fill-opacity="0.85"/>
        <text x="${168 + barW}" y="${y + 13}" fill="${colorVar("text.secondary")}" font-family="var(--font-body)" font-size="11" style="font-variant-numeric:tabular-nums">${sizeText}, weight ${entry.fontWeight}</text>
      </g>`;
    })
    .join("");

  const floorX = 160 + Math.round((tokens.native.fontSizes.xs / maxPx) * maxBar);

  return `<figure class="diagram-figure">
    <svg viewBox="0 0 680 ${height}" role="img" aria-labelledby="diag-type-title diag-type-desc">
      <title id="diag-type-title">Flump type scale ladder</title>
      <desc id="diag-type-desc">Proportional ladder of the fifteen main text styles from display at 48 pixels down to label.sm at the 12 pixel floor.</desc>
      <rect x="1" y="1" width="678" height="${height - 2}" rx="14" fill="${colorVar("surface.subtle")}" stroke="${colorVar("border")}"/>
      <text x="20" y="24" fill="${colorVar("text.primary")}" font-family="var(--font-heading)" font-size="12" font-weight="700">Text style</text>
      <text x="160" y="24" fill="${colorVar("text.primary")}" font-family="var(--font-heading)" font-size="12" font-weight="700">Rendered ceiling size (48px max, 12px floor)</text>
      <line x1="${floorX}" y1="32" x2="${floorX}" y2="${height - 16}" stroke="${colorVar("border.strong")}" stroke-dasharray="3 3"/>
      <text x="${floorX}" y="${height - 5}" text-anchor="middle" fill="${colorVar("text.muted")}" font-family="var(--font-mono)" font-size="9.5">12px floor (T2)</text>
      ${items}
    </svg>
    <figcaption class="diagram-caption">
      Type ladder generated from <code>native.generated.ts</code> <code>textStyles</code>. Plus Jakarta Sans headings use teal bars; Inter body, label and numeric styles use accent bars.
    </figcaption>
  </figure>`;
}
