import { css } from "@repo/ui/styled-system/css";
import type { FC, ReactNode } from "react";

export type SectionBandTone = "canvas" | "subtle" | "tinted" | "contrast";

export interface SectionBandProps {
  id?: string;
  tone?: SectionBandTone;
  indexBadge?: string;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export const SectionBand: FC<SectionBandProps> = ({
  id,
  tone = "canvas",
  indexBadge,
  title,
  subtitle,
  children,
  className,
}) => {
  const getToneStyles = () => {
    switch (tone) {
      case "subtle":
        return css({
          backgroundColor: { base: "slate.50", _dark: "dark.subtle" },
          borderTop: "1px solid",
          borderBottom: "1px solid",
          borderColor: { base: "slate.200", _dark: "dark.border" },
        });
      case "tinted":
        return css({
          backgroundColor: { base: "indigo.50", _dark: "rgba(99, 102, 241, 0.08)" },
          borderTop: "1px solid",
          borderBottom: "1px solid",
          borderColor: { base: "indigo.200", _dark: "rgba(99, 102, 241, 0.25)" },
        });
      case "contrast":
        return css({
          backgroundColor: { base: "slate.900", _dark: "dark.contrast" },
          color: "#ffffff",
          borderTop: "1px solid",
          borderBottom: "1px solid",
          borderColor: { base: "slate.800", _dark: "slate.700" },
        });
      default:
        return css({
          backgroundColor: { base: "#ffffff", _dark: "dark.canvas" },
        });
    }
  };

  const isContrast = tone === "contrast";

  return (
    <section id={id} className={`${getToneStyles()} ${className || ""}`}>
      <div
        className={css({
          maxWidth: "6xl",
          mx: "auto",
          py: { base: "14", md: "20" },
          px: { base: "4", sm: "6" },
        })}
      >
        {(indexBadge || title || subtitle) && (
          <div
            className={css({
              textAlign: "center",
              mb: { base: "10", md: "14" },
              maxWidth: "760px",
              mx: "auto",
            })}
          >
            {indexBadge && (
              <span
                className={css({
                  display: "inline-block",
                  fontFamily: "var(--fonts-mono, monospace)",
                  fontSize: "xs",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  px: "3",
                  py: "1",
                  borderRadius: "full",
                  backgroundColor: isContrast
                    ? "rgba(255, 255, 255, 0.12)"
                    : { base: "rgba(79, 70, 229, 0.1)", _dark: "rgba(99, 102, 241, 0.15)" },
                  color: isContrast ? "#38bdf8" : "primary",
                  mb: "3",
                })}
              >
                {indexBadge}
              </span>
            )}
            {title && (
              <h2
                className={css({
                  fontFamily: "var(--fonts-display, 'Plus Jakarta Sans', sans-serif)",
                  fontSize: { base: "2rem", sm: "2.5rem", md: "2.85rem" },
                  fontWeight: "800",
                  lineHeight: "1.15",
                  letterSpacing: "-0.03em",
                  color: isContrast ? "#ffffff" : "var(--colors-text-primary, #0f172a)",
                  margin: 0,
                })}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                className={css({
                  fontSize: { base: "md", md: "lg" },
                  color: isContrast
                    ? "rgba(255, 255, 255, 0.75)"
                    : "var(--colors-text-muted, #475569)",
                  lineHeight: "1.6",
                  mt: "3",
                  mb: 0,
                  mx: "auto",
                  maxWidth: "640px",
                })}
              >
                {subtitle}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
};
