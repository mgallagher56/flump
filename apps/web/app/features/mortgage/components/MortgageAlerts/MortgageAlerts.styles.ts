import { cva } from "@repo/ui/styled-system/css";

export const alertBanner = cva({
  base: {
    p: "14px 16px",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
    minWidth: 0,
  },
  variants: {
    tone: {
      info: { backgroundColor: "status.info.bg", borderColor: "status.info.border" },
      danger: { backgroundColor: "status.danger.bg", borderColor: "status.danger.border" },
      warning: { backgroundColor: "status.warning.bg", borderColor: "status.warning.border" },
    },
  },
});

export const alertBody = cva({
  base: { display: "flex", alignItems: "flex-start", gap: "10px", flex: "1 1 240px", minWidth: 0 },
  variants: {
    tone: {
      info: { color: "status.info.text" },
      danger: { color: "status.danger.text" },
      warning: { color: "status.warning.text" },
    },
  },
});

export const alertTitle = cva({
  base: { textStyle: "label.md", margin: 0, color: "inherit" },
});

export const alertText = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: "2px 0 0 0" },
});

export const alertDate = cva({
  base: { fontVariantNumeric: "tabular-nums", fontWeight: "semibold" },
});
