import { cva } from "@repo/ui/styled-system/css";

/** The two data sections under the not-invited message, spaced as the settings Data tab is. */
export const notInvitedDataStack = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "page.section",
    minWidth: 0,
    marginTop: "page.section",
  },
});
