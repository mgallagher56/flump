import { cva } from "@repo/ui/styled-system/css";

export const cardRoot = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 },
});

export const cardSurface = cva({
  base: {
    padding: "16px",
    borderRadius: "card",
    backgroundColor: "surface.card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
  },
});

export const cardNav = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
  },
});

/** A quiet text button, still a 24px target at least. */
export const restButton = cva({
  base: { alignSelf: "flex-start", minHeight: "6" },
});
