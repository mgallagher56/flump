import { cva } from "@repo/ui/styled-system/css";

export const root = cva({
  base: {
    paddingY: "3",
    paddingX: "4",
    borderRadius: "lg",
    border: "1px solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.subtle",
  },
});

export const text = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0 },
});

export const link = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "1",
    color: "primary",
    textDecoration: "underline",
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});

export const srOnly = cva({ base: { srOnly: true } });
