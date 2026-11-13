import { cva } from "@repo/ui/styled-system/css";

export const guideRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "32px",
    paddingTop: "32px",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
  },
});

export const guideSection = cva({
  base: { display: "flex", flexDirection: "column", gap: "24px", maxWidth: "3xl" },
});

export const guideBlock = cva({ base: { display: "flex", flexDirection: "column", gap: "8px" } });

export const faqList = cva({
  base: { display: "flex", flexDirection: "column", gap: "12px", maxWidth: "3xl" },
});
