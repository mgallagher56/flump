import { cva } from "@repo/ui/styled-system/css";

/** Same rhythm as "How it could grow", so the two tabs read as one tool. */
export const timelineControls = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", minWidth: 0 },
});
