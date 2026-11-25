import { cva } from "@repo/ui/styled-system/css";

export const leaveRoot = cva({
  base: { display: "flex", flexDirection: "column", gap: "3", minWidth: 0 },
});

export const leaveText = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: 0 },
});
