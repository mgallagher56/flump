import { cva } from "@repo/ui/styled-system/css";

/** Space above the footer on marketing pages, which end in a section rather than a page frame. */
export const footerSpacing = cva({ base: { mt: "24" } });

export const footerBottomRow = cva({
  base: { display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "4" },
});

/** Highlights a business detail that is still a placeholder (pre-launch builds only). */
export const footerPlaceholder = cva({
  base: {
    fontWeight: "600",
    color: "status.warning.text",
    backgroundColor: "status.warning.bg",
    border: "1px solid",
    borderColor: "status.warning.border",
    borderRadius: "md",
    padding: "1 2",
  },
});

export const footerExternalIcon = cva({ base: { display: "inline", marginLeft: "1" } });
