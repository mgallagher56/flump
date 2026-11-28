import { renderSpacingBlocksDiagram } from "../diagrams/spacingBlocks";
import { renderProvenanceComment } from "../renderHelpers";
import { type BrandTokens, shadowVar } from "../tokens";

export function renderLayoutChapter(tokens: BrandTokens): string {
  const { native } = tokens;

  const readingOrder = [
    "Page header",
    "Headline figure",
    "Summary strip",
    "Your saved details",
    "What-if modelling",
    "Further details",
  ];

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
    <div class="chapter-head">
      <span class="chapter-kicker">Chapter 06</span>
      <h2 class="chapter-title">Layout, radius and elevation</h2>
    </div>

    <p class="prose">
      Consistent rhythm keeps financial figures scannable. Every page uses a 4 pixel spacing scale, follows one predictable reading order from saved facts at the top to optional modelling below, and nests softer inner corners inside larger outer containers.
    </p>

    <article class="card">
      <h3 class="card-title">One page reading order</h3>
      <p class="prose">
        Saved facts always come first. What-if controls stay separated in a dashed modelling zone labelled "Illustration, not saved" so estimates never overwrite real balances.
      </p>
      <div class="reading-order-strip">
        ${readingOrder.map((step, i) => `<span class="pill num">${i + 1}. ${step}</span>`).join("")}
      </div>
    </article>

    ${renderSpacingBlocksDiagram(tokens)}

    <h3 class="sub-title">Corner radii</h3>
    <p class="prose">A nested shape always uses a smaller corner radius than the container around it.</p>
    <div class="grid-3">
      ${radiusCards}
    </div>

    <h3 class="sub-title">Elevation and shadows</h3>
    <p class="prose">
      Light mode shadows use a faint deep-green ink tint rather than cold grey-blue. Dark mode separates layers through stepped charcoal surfaces, a crisp border and a subtle top highlight.
    </p>
    <div class="grid-2">
      ${shadowDemos}
    </div>

    <article class="card-subtle">
      <h3 class="card-title">Layout rules</h3>
      <ul class="plain-list">
        <li>Every interactive button and link keeps at least a 44 by 44 pixel tap target across compact and phone layouts.</li>
        <li>Phone navigation switches to a compact top bar and slide-out drawer at 768 pixels, expanding to the full top bar at 1024 pixels.</li>
        <li>What-if modelling zones use a dashed border with no background fill so they stay visually lighter than saved cards.</li>
      </ul>
    </article>

    ${renderProvenanceComment("STYLE-GUIDE 4, 5, 6; packages/tokens/src/index.ts, layout.ts, elevation.ts, breakpoints.ts")}
  </section>`;
}
