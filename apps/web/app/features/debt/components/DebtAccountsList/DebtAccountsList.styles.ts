import { css, cva } from "@repo/ui/styled-system/css";

export const listCard = cva({
  base: {
    minWidth: 0,
    padding: { base: "16px", md: "24px" },
    backgroundColor: "surface.card",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
});

export const listHeader = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },
});

export const listHeading = css({
  margin: 0,
  textStyle: "heading.md",
  color: "text.primary",
});

export const listSubtitle = css({
  margin: 0,
  marginTop: "2px",
  fontSize: "xs",
  color: "text.muted",
});

export const creditorName = css({ fontWeight: "semibold", color: "text.primary" });

export const figure = css({ fontVariantNumeric: "tabular-nums", color: "text.primary" });

export const mutedFigure = css({
  color: "text.muted",
  fontSize: "xs",
  marginInlineStart: "6px",
});

export const aprCell = cva({
  base: {
    display: "inline-flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "4px 8px",
    fontVariantNumeric: "tabular-nums",
  },
});

export const aprNotSet = css({ color: "text.muted" });

export const actionsCell = cva({
  base: { display: "inline-flex", alignItems: "center", gap: "4px" },
});

export const deleteAction = css({
  color: "status.danger.text",
});

export const drawerWrap = css({ marginTop: "8px" });
