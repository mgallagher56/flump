import { cva } from "@repo/ui/styled-system/css";

export const sampleNote = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    margin: 0,
    textStyle: "body.sm",
    color: "text.secondary",
  },
});
