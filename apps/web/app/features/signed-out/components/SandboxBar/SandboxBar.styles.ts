import { cva } from "@repo/ui/styled-system/css";

export const barRoot = cva({
  base: {
    // Sticky only from md up: on phones the bar would otherwise cover a third of the screen.
    position: { base: "static", md: "sticky" },
    top: 0,
    zIndex: 40,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: { base: "8px 12px", md: "10px 16px" },
    backgroundColor: "surface.card",
    color: "text.primary",
    borderRadius: "card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    boxShadow: "card",
  },
});

export const barGroup = cva({
  base: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: "12px" },
});

export const barTitle = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    textStyle: "label.md",
    color: "text.primary",
  },
});

export const personaSet = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    border: "none",
    padding: 0,
    margin: 0,
  },
});

export const barHint = cva({
  base: { textStyle: "body.sm", color: "text.muted", display: { base: "none", md: "inline" } },
});

export const legendHidden = cva({ base: { srOnly: true } });

/** Page column for the sandbox route: bar, sample-data note, then the dashboard. */
export const sandboxPage = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: { base: "12px", md: "24px" },
    paddingTop: { base: "8px", md: "16px" },
    paddingBottom: "48px",
    width: "100%",
    maxWidth: "1536px",
    margin: "0 auto",
  },
});
