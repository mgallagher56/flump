import { cva } from "@repo/ui/styled-system/css";

export const breathingRoomGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", lg: "1fr 1fr" },
    gap: "4",
    alignItems: "start",
  },
});
