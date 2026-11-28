import { type BrandTokens, colorVar } from "../tokens";

export function renderSpacingBlocksDiagram(tokens: BrandTokens): string {
  const s = tokens.native.spacing;
  const steps = [
    { key: "1", px: s["1"], label: "Step 1" },
    { key: "2", px: s["2"], label: "Step 2" },
    { key: "3", px: s["3"], label: "Step 3" },
    { key: "4", px: s["4"], label: "Step 4" },
    { key: "5", px: s["5"], label: "Step 5" },
    { key: "6", px: s["6"], label: "Step 6" },
    { key: "8", px: s["8"], label: "Step 8" },
    { key: "section", px: s["page.section"], label: "Section gap" },
    { key: "10", px: s["10"], label: "Step 10" },
    { key: "12", px: s["12"], label: "Step 12" },
    { key: "16", px: s["16"], label: "Step 16" },
    { key: "20", px: s["20"], label: "Step 20" },
    { key: "24", px: s["24"], label: "Step 24" },
    { key: "32", px: s["32"], label: "Step 32" },
  ];

  const rowH = 26;
  const topPad = 36;
  const svgH = topPad + steps.length * rowH + 18;
  const scale = 3.2;

  const bars = steps
    .map((step, i) => {
      const y = topPad + i * rowH;
      const w = Math.max(4, Math.round(step.px * scale));
      const isSection = step.key === "section";
      const fill = isSection ? colorVar("accent") : colorVar("primary");
      return `
      <g>
        <text x="20" y="${y + 14}" fill="${colorVar("text.primary")}" font-family="var(--font-body)" font-size="11">${step.label}</text>
        <rect x="132" y="${y + 3}" width="${w}" height="14" rx="3" fill="${fill}" fill-opacity="0.88"/>
        <text x="${140 + w}" y="${y + 14}" fill="${colorVar("text.secondary")}" font-family="var(--font-body)" font-size="11" font-weight="600" style="font-variant-numeric:tabular-nums">${step.px}px${isSection ? " (between page sections)" : ""}</text>
      </g>`;
    })
    .join("");

  return `<figure class="diagram-figure" data-diagram="spacing-blocks">
    <svg viewBox="0 0 680 ${svgH}" role="img" aria-labelledby="diag-space-title diag-space-desc">
      <title id="diag-space-title">Spacing scale blocks</title>
      <desc id="diag-space-desc">The 4 pixel spacing scale from 4 pixels to 128 pixels plus the 36 pixel gap between page sections.</desc>
      <rect x="1" y="1" width="678" height="${svgH - 2}" rx="14" fill="${colorVar("surface.subtle")}" stroke="${colorVar("border")}"/>
      <text x="20" y="22" fill="${colorVar("text.primary")}" font-family="var(--font-heading)" font-size="12" font-weight="700">Step</text>
      <text x="132" y="22" fill="${colorVar("text.primary")}" font-family="var(--font-heading)" font-size="12" font-weight="700">4px step scale (drawn to scale)</text>
      ${bars}
    </svg>
    <figcaption class="diagram-caption">
      Every gap and padding measurement comes from a 4 pixel scale, with a 36 pixel gap between major page sections so groups stay distinct.
    </figcaption>
  </figure>`;
}
