import { css } from "@repo/ui/styled-system/css";

/** "Part of one picture": the five areas as pills, each with its area's orb. */
export const pills = css({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: "3",
});

export const pillLink = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "0.6rem",
  py: "2",
  pl: "0.55rem",
  pr: "4",
  borderRadius: "full",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "border",
  backgroundColor: "surface.card",
  boxShadow: "sm",
  color: "text.primary",
  fontWeight: "semibold",
  textDecoration: "none",
  "&[aria-current=page]": { borderColor: "border.strong" },
  _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
});

export const pillOrb = css({ "--orb-size": "26px" });

/** The prototype's 13px is not on the type scale: the nearest step, 14px. */
export const pillHere = css({ fontSize: "sm", fontWeight: "medium", color: "text.secondary" });
