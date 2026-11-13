import { cva } from "@repo/ui/styled-system/css";

export const body = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4",
    marginTop: "4",
  },
});

export const pdfBox = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2",
    width: "100%",
    p: "8",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "dashed",
    borderColor: "border",
    backgroundColor: "surface.subtle",
    color: "text.secondary",
    textAlign: "center",
  },
});

export const fileName = cva({
  base: { textStyle: "label.md", color: "text.primary", wordBreak: "break-all" },
});

export const image = cva({
  base: { maxWidth: "100%", maxHeight: "360px", borderRadius: "lg", objectFit: "contain" },
});

export const empty = cva({
  base: { textStyle: "body.sm", color: "text.muted", margin: 0 },
});

export const footer = cva({
  base: { display: "flex", justifyContent: "flex-end", width: "100%" },
});
