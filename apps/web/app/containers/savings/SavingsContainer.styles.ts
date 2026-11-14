import { cva } from "@repo/ui/styled-system/css";

/** Each scenario tool panel: space between the tab list and the tool. */
export const toolPanel = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", pt: "4", minWidth: 0 },
});

export const emptyWrap = cva({
  base: { display: "flex", justifyContent: "center", minWidth: 0 },
});
