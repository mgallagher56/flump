import { css, cva } from "@repo/ui/styled-system/css";

export const pageStyle = css({ minHeight: "100vh", display: "flex", flexDirection: "column" });
export const mainStyle = css({ flex: "1" });
export const headerBlockStyle = css({ textAlign: "center", marginBottom: "10" });

export const containerStyle = css({ maxWidth: "6xl", mx: "auto", py: "16", px: "4" });

export const eyebrowStyle = css({ fontSize: "12px", fontWeight: "600", color: "primary" });

export const headingStyle = css({
  fontSize: "clamp(2rem, 4vw, 3rem)",
  fontWeight: "800",
  color: "text.primary",
  marginTop: "2",
});

export const introStyle = css({
  fontSize: "1.1rem",
  color: "text.secondary",
  maxWidth: "600px",
  margin: "3 auto 0",
});

export const toggleRowStyle = css({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "3",
  marginTop: "8",
});

export const toggleLabelStyle = cva({
  base: { fontSize: "14px", color: "text.primary" },
  variants: { active: { true: { fontWeight: "700" }, false: { fontWeight: "500" } } },
  defaultVariants: { active: false },
});

export const toggleTrackStyle = css({
  width: "56px",
  height: "30px",
  borderRadius: "full",
  border: "1px solid",
  borderColor: "border.input",
  backgroundColor: "surface.subtle",
  cursor: "pointer",
  position: "relative",
  padding: "3px",
  '&[aria-checked="true"]': { backgroundColor: "primary.solid", borderColor: "primary.border" },
  _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
});

export const toggleThumbStyle = cva({
  base: {
    display: "block",
    width: "22px",
    height: "22px",
    borderRadius: "full",
    backgroundColor: "surface.card",
    boxShadow: "sm",
    transition: "transform 0.2s ease",
  },
  variants: {
    checked: { true: { transform: "translateX(26px)" }, false: { transform: "translateX(0)" } },
  },
  defaultVariants: { checked: false },
});

export const cardGridStyle = cva({
  base: { display: "grid", gap: "8", maxWidth: "4xl", mx: "auto", mb: "16" },
  variants: {
    paid: {
      true: { gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)" } },
      false: { gridTemplateColumns: "1fr", maxWidth: "md" },
    },
  },
  defaultVariants: { paid: true },
});

export const cardStyle = css({
  backgroundColor: "surface.card",
  border: "2px solid",
  borderColor: "border",
  borderRadius: "2xl",
  padding: "8",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  '&[data-featured="true"]': { borderColor: "primary.border" },
});

export const planNameStyle = css({ fontSize: "1.5rem", fontWeight: "800", color: "text.primary" });
export const planDescStyle = css({ fontSize: "14px", color: "text.secondary", minHeight: "42px" });

export const priceRowStyle = css({
  margin: "6 0 2",
  display: "flex",
  alignItems: "baseline",
  gap: "1",
  flexWrap: "wrap",
});

export const priceStyle = css({
  fontSize: "2.75rem",
  fontWeight: "900",
  color: "text.primary",
  fontVariantNumeric: "tabular-nums",
});

export const priceUnitStyle = css({
  fontSize: "1rem",
  color: "text.secondary",
  fontVariantNumeric: "tabular-nums",
});

export const placeholderNoteStyle = css({
  fontSize: "12px",
  fontWeight: "600",
  color: "status.warning.text",
  backgroundColor: "status.warning.bg",
  border: "1px solid",
  borderColor: "status.warning.border",
  borderRadius: "md",
  padding: "1 2",
  display: "inline-block",
  marginBottom: "6",
});

export const priceSpacerStyle = css({ height: "36px" });
export const featureListStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "3",
  marginBottom: "8",
  listStyle: "none",
  padding: "0",
});
export const featureItemStyle = css({ display: "flex", alignItems: "center", gap: "2" });
export const featureStyle = css({ fontSize: "14px", color: "text.primary" });
export const checkStyle = css({ color: "status.positive.text", flexShrink: 0 });
export const pendingStyle = css({ color: "text.muted", flexShrink: 0 });
export const linkResetStyle = css({ textDecoration: "none" });
export const fullWidthButtonStyle = css({ width: "100%", justifyContent: "center" });
