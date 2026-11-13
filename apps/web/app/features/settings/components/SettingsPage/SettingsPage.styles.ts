import { cva } from "@repo/ui/styled-system/css";

export const root = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "6",
    maxWidth: "4xl",
    marginX: "auto",
    paddingBottom: "12",
    minWidth: 0,
  },
});

/** The one `surface.hero` block on the page: who is signed in. */
export const hero = cva({
  base: {
    display: "flex",
    alignItems: "center",
    flexWrap: { base: "wrap", sm: "nowrap" },
    gap: "5",
    padding: { base: "5", md: "7" },
    borderRadius: "card",
    backgroundColor: "surface.hero",
    color: "text.onContrast",
    minWidth: 0,
  },
});

export const heroText = cva({
  base: { display: "flex", flexDirection: "column", gap: "1", minWidth: 0 },
});

export const heroEyebrow = cva({
  base: { textStyle: "label.sm", color: "text.onContrast", margin: 0 },
});

export const heroName = cva({
  base: { textStyle: "heading.lg", color: "text.onContrast", margin: 0, overflowWrap: "anywhere" },
});

export const heroEmail = cva({
  base: { textStyle: "body.md", color: "text.onContrast", margin: 0, overflowWrap: "anywhere" },
});
