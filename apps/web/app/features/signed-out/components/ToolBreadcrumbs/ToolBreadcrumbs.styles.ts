import { cva } from "@repo/ui/styled-system/css";

export const crumbList = cva({
  base: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "6px",
    textStyle: "body.sm",
    color: "text.muted",
  },
});

export const crumbItem = cva({
  base: { display: "inline-flex", alignItems: "center", gap: "6px" },
});

export const crumbLink = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    color: "text.secondary",
    textDecoration: "none",
    borderRadius: "sm",
    _hover: { color: "primary", textDecoration: "underline" },
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});

export const crumbCurrent = cva({ base: { color: "text.primary", fontWeight: "medium" } });
