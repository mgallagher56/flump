import { cva } from "@repo/ui/styled-system/css";

export const noSalaryNote = cva({
  base: { margin: 0, textStyle: "body.md", color: "text.secondary" },
});

export const noSalaryLink = cva({
  base: { color: "primary", fontWeight: "semibold", textDecoration: "underline" },
});
