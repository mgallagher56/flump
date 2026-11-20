import { cva } from "@repo/ui/styled-system/css";

export const newInviteLinkRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "3",
    padding: "4",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    backgroundColor: "surface.card",
  },
});

export const newInviteLinkRow = cva({
  base: {
    display: "flex",
    gap: "2",
    alignItems: "stretch",
    flexDirection: { base: "column", sm: "row" },
  },
});

export const newInviteLinkInput = cva({
  base: { flex: "1", minWidth: "0", fontFamily: "mono" },
});

export const newInviteLinkNote = cva({
  base: { textStyle: "body.sm", color: "text.secondary", fontVariantNumeric: "tabular-nums" },
});
