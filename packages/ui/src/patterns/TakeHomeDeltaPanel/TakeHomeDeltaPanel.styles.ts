import { cva } from "../../../styled-system/css";

/**
 * Flat, with no card of its own: it always sits inside a calculator card or a scenario zone,
 * and a card inside a card is what P5 and the ScenarioZone rule forbid.
 */
export const deltaPanelRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4",
    color: "text.primary",
  },
});

export const deltaPanelHeader = cva({
  base: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "2" },
});

export const deltaPanelTitle = cva({
  base: { textStyle: "heading.sm", color: "text.primary", margin: "0", marginRight: "auto" },
});

export const deltaPanelSentence = cva({
  base: {
    textStyle: "body.lg",
    color: "text.primary",
    margin: "0",
    fontVariantNumeric: "tabular-nums",
  },
});

export const deltaPanelNumeric = cva({
  base: { fontVariantNumeric: "tabular-nums" },
});

export const deltaPanelAssumptions = cva({
  base: { display: "flex", flexDirection: "column", gap: "2" },
});

export const deltaPanelAssumptionsList = cva({
  base: {
    margin: "0",
    paddingLeft: "5",
    listStyleType: "disc",
    display: "flex",
    flexDirection: "column",
    gap: "1",
    textStyle: "body.sm",
    color: "text.secondary",
  },
});

export const deltaPanelUnverified = cva({
  base: { color: "status.warning.text", fontWeight: "medium" },
});

/** The unverified sentence when the page's one notice lives elsewhere: quiet text, no status fill. */
export const deltaPanelUnverifiedNote = cva({
  base: { margin: "0", textStyle: "body.sm", color: "text.secondary" },
});
