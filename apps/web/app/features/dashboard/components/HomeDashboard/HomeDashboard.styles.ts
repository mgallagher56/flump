import { cva } from "@repo/ui/styled-system/css";

export const dashboardPage = cva({
  base: {
    maxWidth: "100%",
    margin: "0 auto",
    paddingTop: { base: "12px", md: "20px" },
    paddingBottom: { base: "24px", md: "40px" },
    paddingX: { base: "16px", md: "24px" },
    display: "flex",
    flexDirection: "column",
    gap: { base: "16px", md: "24px" },
    minWidth: 0,
  },
});

export const widgetGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" },
    alignItems: "stretch",
    gap: { base: "12px", md: "20px" },
    // The legacy widget cards still render their own settings cog (it is not gated on edit mode).
    // Hide it here so no per-widget configuration is reachable until the widgets move to WidgetCard.
    "& [title='Customise widget']": { display: "none" },
  },
});

export const showHideButton = cva({
  base: { gap: "8px" },
});
