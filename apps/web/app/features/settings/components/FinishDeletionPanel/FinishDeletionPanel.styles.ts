import { cva } from "@repo/ui/styled-system/css";

export const finishCard = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", width: "100%", maxWidth: "32rem" },
});

export const finishHeading = cva({
  base: { textStyle: "heading.lg", color: "text.primary", margin: 0 },
});

export const finishCopy = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: 0 },
});

export const finishForm = cva({
  base: { display: "flex", flexDirection: "column", gap: "4" },
});

export const finishActions = cva({
  base: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "3" },
});
