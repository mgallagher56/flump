import { cva } from "../../../styled-system/css";

/**
 * E16 P4.2 `note` style: quiet text on whatever surface holds it. No fill, no status colour, a
 * top hairline to separate it from the content it qualifies. Disclaimers never use `status.info`.
 */
export const projectionNotice = cva({
  base: {
    display: "flex",
    alignItems: "flex-start",
    gap: "2",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
    backgroundColor: "transparent",
    color: "text.secondary",
    textStyle: "body.sm",
    paddingTop: "3",
    margin: "0",
  },
});

export const projectionNoticeIcon = cva({
  base: { flexShrink: 0, display: "inline-flex", marginTop: "0.5", color: "text.muted" },
});

export const projectionNoticeText = cva({
  base: { margin: "0", flex: "1", minWidth: "0" },
});
