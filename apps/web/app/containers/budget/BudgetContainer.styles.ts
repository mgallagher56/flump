import { cva } from "@repo/ui/styled-system/css";

export const pageRoot = cva({
  base: { display: "flex", flexDirection: "column", gap: "24px", paddingBottom: "48px" },
});

export const pageActions = cva({
  base: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
});

export const tabContent = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px" },
});

export const errorBanner = cva({
  base: {
    padding: "12px 16px",
    borderRadius: "lg",
    textStyle: "body.sm",
    backgroundColor: "status.danger.bg",
    color: "status.danger.text",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "status.danger.border",
  },
});
