import { cva } from "../../../styled-system/css";

export const taperBannerContainer = cva({
  base: {
    borderRadius: "2xl",
    borderWidth: "1px",
    borderStyle: "solid",
    p: { base: "18px 16px", md: "22px 24px" },
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    boxShadow: "card",
  },
  variants: {
    inBand: {
      true: {
        borderColor: "status.info.border",
        backgroundColor: "status.info.bg",
      },
      false: {
        borderColor: "status.neutral.border",
        backgroundColor: "status.neutral.bg",
      },
    },
  },
  defaultVariants: {
    inBand: true,
  },
});

export const taperHeaderRow = cva({
  base: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    flexWrap: "wrap",
  },
});

export const taperSliderPanel = cva({
  base: {
    p: "16px",
    borderRadius: "xl",
    backgroundColor: "surface.card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
});

export const reliefMetricsGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", sm: "repeat(3, 1fr)" },
    gap: "12px",
    pt: "10px",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
  },
});
