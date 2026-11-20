import { cva } from "@repo/ui/styled-system/css";

export const tools = cva({
  base: { display: "flex", flexDirection: "column", gap: { base: "12", md: "16" } },
});

export const tool = cva({
  base: { display: "flex", flexDirection: "column", gap: "3" },
});

/** "If you have a mortgage": the mortgage part opens with it, so the page reads the same for renters. */
export const toolLead = cva({
  base: { textStyle: "label.md", color: "text.secondary", margin: 0 },
});

export const toolTitle = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: 0 },
});

export const toolLine = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: 0 },
});

export const inAppLine = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0 },
});
