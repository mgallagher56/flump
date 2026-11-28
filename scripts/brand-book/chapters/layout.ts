import { renderSpacingBlocksDiagram } from "../diagrams/spacingBlocks";
import { renderChapterOpener, renderProvenanceComment, renderScreenPair } from "../renderHelpers";
import { type BrandTokens, shadowVar } from "../tokens";

export function renderLayoutChapter(tokens: BrandTokens): string {
  const { native } = tokens;

  const readingOrder = [
    { label: "Page header", note: "Title and one plain sentence", dashed: false },
    { label: "Headline figure", note: "One saved fact, never an estimate", dashed: false },
    { label: "Summary strip", note: "Supporting figures from saved records", dashed: false },
    {
      label: "Your saved details",
      note: "Editable inputs separated from scenarios",
      dashed: false,
    },
    {
      label: "What-if modelling",
      note: "Dashed zone tagged Illustration, not saved",
      dashed: true,
    },
    { label: "Further details", note: "Collapsed behind Show details", dashed: false },
  ];

  const openerVisual = `<div class="opener-visual-plate">
    <p class="chapter-kicker">One reading order on every page</p>
    <ol class="reading-order-list">
      ${readingOrder
        .map(
          (
            step,
            i,
          ) => `<li class="reading-order-step${step.dashed ? " reading-order-step-dashed" : ""}">
            <span class="reading-step-num num">${i + 1}</span>
            <div>
              <strong style="display:block;font-size:var(--text-body-sm-size)">${step.label}</strong>
              <span class="swatch-note">${step.note}</span>
            </div>
          </li>`,
        )
        .join("")}
    </ol>
  </div>`;

  const radiusItems: ReadonlyArray<{
    key: keyof typeof native.radii;
    name: string;
    note: string;
  }> = [
    { key: "none", name: "Square", note: "Flush dividers and full-bleed edges" },
    { key: "xs", name: "Tag", note: "Compact badges inside dense tables" },
    { key: "sm", name: "Small control", note: "Compact switches and inline pills" },
    { key: "control", name: "Control", note: "Buttons, text fields and slider readouts" },
    { key: "lg", name: "Selected tab", note: "Active tab thumbs and icon tiles" },
    { key: "card", name: "Card", note: "Data cards, tables and drawers" },
    { key: "tray", name: "Tray", note: "Dialogs, sheets and headline panels" },
    { key: "full", name: "Pill", note: "Status pills, avatars and theme switches" },
  ];

  const radiusCards = radiusItems
    .map((item) => {
      const val = `${native.radii[item.key]}px`;
      const demoRadius = item.key === "full" ? "9999px" : val;
      return `<div class="card">
        <div class="radius-demo num" style="border-radius:${demoRadius}">${val}</div>
        <strong>${item.name}</strong>
        <p class="swatch-note">${item.note}</p>
      </div>`;
    })
    .join("");

  const shadowCards: ReadonlyArray<{
    key: keyof typeof native.light.shadows;
    name: string;
    note: string;
  }> = [
    { key: "xs", name: "Subtle lift", note: "Active tab thumbs and small resting pills" },
    { key: "card", name: "Resting card", note: "Standard cards and tables paired with a 1px edge" },
    { key: "raised", name: "Raised surface", note: "Hovered cards, dragged items and sticky bars" },
    { key: "overlay", name: "Floating overlay", note: "Dialogs, side sheets, menus and toasts" },
  ];

  const shadowDemos = shadowCards
    .map(
      (item) => `<div class="shadow-demo" style="box-shadow:${shadowVar(item.key)}">
        <strong>${item.name}</strong>
        <p class="swatch-note">${item.note}</p>
      </div>`,
    )
    .join("");

  return `<section class="chapter" id="layout-radius-elevation">
    ${renderChapterOpener({
      num: "06",
      title: "Layout, radius and elevation",
      lead: "Saved facts always lead the page, what-if sliders stay inside dashed zones, and softer inner corners nest inside larger frames.",
      visualHtml: openerVisual,
      surface: "card",
      hook: "chapter-06",
    })}

    <div class="spread">
      <div class="spread-inner">
        ${renderScreenPair({
          baseName: "web-budget",
          title: "Progressive disclosure in practice",
          copy: "Your budget opens with the single left-over figure, followed by money in and money out, keeping detailed adjustments tucked cleanly underneath.",
          desktopAlt:
            "Your budget page at 1280px showing left over figure above income and outgoing cards",
          phoneAlt: "Your budget page at 375px phone width",
          caption:
            "Your budget at 1280px and 375px. Every interactive target keeps at least 44 by 44 pixels on touch screens.",
        })}
      </div>
    </div>

    <div class="spread spread-subtle">
      <div class="spread-inner">
        <div class="editorial-split">
          ${renderSpacingBlocksDiagram(tokens)}
          <div class="editorial-copy">
            <h3 class="sub-title">Spacing and responsive steps</h3>
            <p class="prose">
              A 4 pixel spacing scale keeps cards, gutters and sections aligned from a 375 pixel phone up to a 1440 pixel desktop.
            </p>
            <ul class="plain-list">
              <li>Phone navigation switches to a compact top bar at 768 pixels and expands to the full navigation bar at 1024 pixels.</li>
              <li>Interactive buttons and links preserve a 44 by 44 pixel minimum tap target even in compact density.</li>
              <li>What-if modelling zones use a dashed border with no background fill so estimates never look like saved balances.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div class="spread">
      <div class="spread-inner">
        <div class="editorial-copy">
          <h3 class="sub-title">Corner radii</h3>
          <p class="prose">A nested shape always uses a smaller corner radius than the container around it.</p>
        </div>
        <div class="grid-4">
          ${radiusCards}
        </div>
      </div>
    </div>

    <div class="spread spread-subtle">
      <div class="spread-inner">
        <div class="editorial-copy">
          <h3 class="sub-title">Elevation and shadows</h3>
          <p class="prose">
            Light mode shadows use a faint deep-green ink tint rather than cold grey-blue. Dark mode separates layers through stepped charcoal surfaces, crisp edges and subtle top highlights.
          </p>
        </div>
        <div class="shadow-tray">
          <div class="grid-2">
            ${shadowDemos}
          </div>
        </div>
      </div>
    </div>

    ${renderProvenanceComment("STYLE-GUIDE 4, 5, 6; packages/tokens/src/index.ts, layout.ts, elevation.ts, breakpoints.ts")}
  </section>`;
}
