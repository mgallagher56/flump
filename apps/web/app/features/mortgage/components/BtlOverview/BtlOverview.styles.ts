import { cva } from "@repo/ui/styled-system/css";

export const btlCard = cva({
  base: {
    backgroundColor: "surface.card",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    boxShadow: "card",
    p: { base: "16px", md: "20px" },
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    minWidth: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

export const btlSubtitle = cva({
  base: {
    textStyle: "body.sm",
    color: "text.secondary",
    margin: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

/**
 * RC-11 (P62): below `sm` the header's Edit action goes on its own line under the title and
 * description, so the description keeps the row's width. From `sm` the header is one row again.
 */
export const stackedHeaderSection = cva({
  base: {
    "& > [id$='-header']": { flexWrap: { base: "wrap", sm: "nowrap" } },
    "& > [id$='-header'] > :nth-child(2)": { flexBasis: { base: "0", sm: "auto" } },
    "& > [id$='-header'] > :nth-child(3)": {
      flexBasis: { base: "100%", sm: "auto" },
      alignSelf: { base: "flex-start", sm: "center" },
    },
  },
});
