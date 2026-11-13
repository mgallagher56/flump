import { cva } from "@repo/ui/styled-system/css";

export const pageStyle = cva({
  base: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "surface.canvas",
    color: "text.primary",
  },
});

export const mainStyle = cva({ base: { flex: 1 } });

export const containerStyle = cva({
  base: { maxWidth: "3xl", mx: "auto", py: "16", px: "4" },
});

export const eyebrowStyle = cva({
  base: { fontSize: "12px", fontWeight: "600", color: "status.positive.text" },
});

export const headingStyle = cva({
  base: {
    fontSize: "clamp(2rem, 4vw, 3rem)",
    fontWeight: "800",
    color: "text.primary",
    mt: "2",
  },
});

export const introStyle = cva({
  base: { fontSize: "1.1rem", color: "text.secondary", mt: "3", mb: "10", lineHeight: "1.6" },
});

export const sectionStyle = cva({
  base: {
    backgroundColor: "surface.card",
    border: "1px solid",
    borderColor: "border",
    borderRadius: "2xl",
    p: { base: "6", md: "8" },
    mb: "6",
    scrollMarginTop: "24",
  },
});

export const sectionHeadingStyle = cva({
  base: { fontSize: "1.25rem", fontWeight: "700", color: "text.primary", mb: "2" },
});

export const bodyStyle = cva({
  base: { fontSize: "15px", color: "text.secondary", lineHeight: "1.7" },
});

export const linkStyle = cva({
  base: {
    color: "primary",
    fontWeight: "600",
    textDecoration: "underline",
    textUnderlineOffset: "2px",
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});

export const buttonLinkStyle = cva({
  base: { display: "inline-block", textDecoration: "none", mt: "4" },
});

export const noteStyle = cva({
  base: { fontSize: "13px", color: "text.muted", mt: "3", lineHeight: "1.6" },
});
