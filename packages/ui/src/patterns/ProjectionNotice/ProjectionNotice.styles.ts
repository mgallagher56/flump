import { cva } from "../../../styled-system/css";

// Direction C: a quiet info treatment. Soft large radius, hairline border, calm text size.
export const projectionNotice = cva({
  base: {
    display: "flex",
    alignItems: "flex-start",
    gap: "3",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "status.info.border",
    backgroundColor: "status.info.bg",
    color: "status.info.text",
    fontSize: "sm",
    lineHeight: "1.5",
    paddingBlock: "3",
    paddingInline: "4",
    margin: "0",
  },
});

export const projectionNoticeIcon = cva({
  base: { flexShrink: 0, display: "inline-flex", marginTop: "0.5" },
});

export const projectionNoticeText = cva({
  base: { margin: "0", flex: "1", minWidth: "0" },
});
