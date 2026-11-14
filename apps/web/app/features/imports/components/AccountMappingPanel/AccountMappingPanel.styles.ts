import { cva } from "@repo/ui/styled-system/css";

export const heading = cva({
  base: { margin: 0, textStyle: "heading.md", color: "text.primary" },
});

export const help = cva({
  base: { margin: 0, marginTop: "4px", textStyle: "body.sm", color: "text.secondary" },
});

export const list = cva({
  base: {
    listStyle: "none",
    margin: 0,
    marginTop: "16px",
    padding: 0,
    display: "grid",
    gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
    gap: "16px",
  },
});

export const staged = cva({
  base: { display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 },
});

export const stagedType = cva({
  base: { textStyle: "body.sm", color: "text.muted" },
});
