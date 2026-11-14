import { cva } from "../../../styled-system/css";

/** One line, never wrapped: at narrow widths only the back link shows, so no chevron dangles. */
export const crumbList = cva({
  base: {
    listStyle: "none",
    margin: "0",
    padding: "0",
    mb: "3",
    display: "flex",
    flexWrap: "nowrap",
    alignItems: "center",
    gap: "1.5",
    minWidth: "0",
    textStyle: "body.sm",
    color: "text.muted",
  },
});

export const crumbItem = cva({
  base: { display: "inline-flex", alignItems: "center", gap: "1.5", flexShrink: 0 },
});

/** The chevron before the current title: hidden with the title below `sm`. */
export const crumbSeparator = cva({
  base: { display: { base: "none", sm: "inline-flex" } },
});

export const crumbLink = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "1",
    color: "text.secondary",
    textDecoration: "none",
    borderRadius: "sm",
    whiteSpace: "nowrap",
    _hover: { color: "primary", textDecoration: "underline" },
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});

/** The current tool: one line with an ellipsis; below `sm` the h1 names it instead. */
export const crumbCurrent = cva({
  base: {
    display: { base: "none", sm: "block" },
    minWidth: "0",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: "text.primary",
    fontWeight: "medium",
  },
});
