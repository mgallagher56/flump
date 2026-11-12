import type { FC } from "react";
import { css } from "../../../styled-system/css";
import { fontSizes, fonts } from "../../tokens";
import { specimenRow, specimenSection } from "./TypographyScale.styles";

// Literal textStyle names so Panda can extract each class statically.
const TEXT_STYLE_SPECIMENS = [
  { name: "display", sample: "Know where you stand", cls: css({ textStyle: "display" }) },
  { name: "heading.xl", sample: "Your net worth", cls: css({ textStyle: "heading.xl" }) },
  { name: "heading.lg", sample: "Mortgage overpayment", cls: css({ textStyle: "heading.lg" }) },
  { name: "heading.md", sample: "Upcoming payments", cls: css({ textStyle: "heading.md" }) },
  { name: "heading.sm", sample: "Account details", cls: css({ textStyle: "heading.sm" }) },
  {
    name: "body.lg",
    sample: "Overpaying £200 a month would clear the mortgage 4 years sooner.",
    cls: css({ textStyle: "body.lg" }),
  },
  {
    name: "body.md",
    sample: "Overpaying £200 a month would clear the mortgage 4 years sooner.",
    cls: css({ textStyle: "body.md" }),
  },
  {
    name: "body.sm",
    sample: "Overpaying £200 a month would clear the mortgage 4 years sooner.",
    cls: css({ textStyle: "body.sm" }),
  },
  { name: "label.md", sample: "Monthly overpayment", cls: css({ textStyle: "label.md" }) },
  { name: "label.sm", sample: "UPDATED 12 NOV 2026", cls: css({ textStyle: "label.sm" }) },
  { name: "numeric.kpi", sample: "£1,240,500", cls: css({ textStyle: "numeric.kpi" }) },
  { name: "numeric.lg", sample: "£85,200.00", cls: css({ textStyle: "numeric.lg" }) },
  { name: "numeric.md", sample: "£1,450.50", cls: css({ textStyle: "numeric.md" }) },
  { name: "numeric.sm", sample: "29.90%", cls: css({ textStyle: "numeric.sm" }) },
] as const;

export const TypographyScale: FC = () => {
  const tabularSpecimens = [
    { label: "High Net Worth", valueA: "£1,240,500", valueB: "£85,200" },
    { label: "Monthly Surplus", valueA: "£1,450.50", valueB: "£250.00" },
    { label: "APR Comparison", valueA: "29.90%", valueB: "4.50%" },
    { label: "Tax Liability", valueA: "£101,081", valueB: "£8,450" },
  ];

  return (
    <div
      className={css({
        p: { base: "16px", md: "24px" },
        backgroundColor: "surface.canvas",
        color: "text.primary",
        minHeight: "100%",
      })}
    >
      <div className={css({ mb: "32px" })}>
        <h1
          className={css({
            fontFamily: "display",
            fontSize: "2xl",
            fontWeight: "bold",
          })}
        >
          Flump Typography Scale & Tabular Numbers
        </h1>
        <p className={css({ fontSize: "sm", color: "text.muted", mt: "4px" })}>
          Font roles: heading (Plus Jakarta Sans), body and numeric (Inter), mono (JetBrains Mono).
          Each role is defined once in tokens/typography.ts.
        </p>
      </div>

      {/* Font Stacks */}
      <div className={specimenSection()}>
        <h2
          className={css({
            fontFamily: "display",
            fontSize: "lg",
            fontWeight: "semibold",
            mb: "16px",
          })}
        >
          Font Family Definitions
        </h2>
        <div className={css({ display: "flex", flexDirection: "column", gap: "16px" })}>
          <div>
            <div className={css({ fontSize: "xs", color: "text.muted", mb: "4px" })}>
              Display (Headings & Hero KPIs)
            </div>
            <div className={css({ fontFamily: "display", fontSize: "xl", fontWeight: "bold" })}>
              Plus Jakarta Sans — The British Personal Finance OS (£100,000)
            </div>
            <code className={css({ fontSize: "xs", color: "text.muted" })}>
              {fonts.display.value}
            </code>
          </div>

          <div>
            <div className={css({ fontSize: "xs", color: "text.muted", mb: "4px" })}>
              Sans (Body & Form Inputs)
            </div>
            <div className={css({ fontFamily: "sans", fontSize: "md" })}>
              Inter — Clear, readable UI typography optimized for density and contrast.
            </div>
            <code className={css({ fontSize: "xs", color: "text.muted" })}>{fonts.sans.value}</code>
          </div>

          <div>
            <div className={css({ fontSize: "xs", color: "text.muted", mb: "4px" })}>
              Mono (Tax Codes & Account Numbers)
            </div>
            <div className={css({ fontFamily: "mono", fontSize: "sm" })}>
              JetBrains Mono — 1257L / 08-92-41 / 2024-25 TAX YEAR
            </div>
            <code className={css({ fontSize: "xs", color: "text.muted" })}>{fonts.mono.value}</code>
          </div>
        </div>
      </div>

      {/* Text styles (E15) */}
      <div className={specimenSection()}>
        <h2
          className={css({
            fontFamily: "display",
            fontSize: "lg",
            fontWeight: "semibold",
            mb: "8px",
          })}
        >
          Text Styles
        </h2>
        <p className={css({ fontSize: "xs", color: "text.muted", mb: "16px" })}>
          Use <code>textStyle</code> instead of assembling size, weight and line height by hand.
          Numeric styles carry tabular-nums.
        </p>
        {TEXT_STYLE_SPECIMENS.map((spec) => (
          <div key={spec.name} className={specimenRow()}>
            <span className={spec.cls}>{spec.sample}</span>
            <code
              className={css({
                fontFamily: "mono",
                fontSize: "xs",
                color: "text.muted",
                flexShrink: 0,
                ml: "16px",
              })}
            >
              {spec.name}
            </code>
          </div>
        ))}
      </div>

      {/* Font Size Hierarchy */}
      <div className={specimenSection()}>
        <h2
          className={css({
            fontFamily: "display",
            fontSize: "lg",
            fontWeight: "semibold",
            mb: "16px",
          })}
        >
          Type Scale (12px minimum floor)
        </h2>
        {Object.entries(fontSizes).map(([key, val]) => (
          <div key={key} className={specimenRow()}>
            <div className={css({ display: "flex", alignItems: "baseline", gap: "12px" })}>
              <span
                className={css({
                  width: "48px",
                  fontFamily: "mono",
                  fontSize: "xs",
                  color: "text.muted",
                })}
              >
                {key}
              </span>
              <span className={css({ fontSize: key as any, fontWeight: "medium" })}>
                Financial Independence & Wealth Optimization
              </span>
            </div>
            <span className={css({ fontFamily: "mono", fontSize: "xs", color: "text.muted" })}>
              {val.value}
            </span>
          </div>
        ))}
      </div>

      {/* Tabular Numbers Verification */}
      <div className={specimenSection()}>
        <h2
          className={css({
            fontFamily: "display",
            fontSize: "lg",
            fontWeight: "semibold",
            mb: "8px",
          })}
        >
          Tabular Numbers Alignment Test
        </h2>
        <p className={css({ fontSize: "xs", color: "text.muted", mb: "16px" })}>
          Assures strict vertical column alignment across varying currency digits.
        </p>

        <div className={css({ maxWidth: "420px" })}>
          {tabularSpecimens.map((specimen) => (
            <div key={specimen.label} className={specimenRow()}>
              <span className={css({ fontSize: "xs", color: "text.secondary" })}>
                {specimen.label}
              </span>
              <div
                className={css({
                  display: "flex",
                  gap: "24px",
                  fontVariantNumeric: "tabular-nums",
                })}
              >
                <span
                  className={css({ fontFamily: "display", fontWeight: "bold", fontSize: "sm" })}
                >
                  {specimen.valueA}
                </span>
                <span
                  className={css({
                    fontFamily: "display",
                    fontWeight: "bold",
                    fontSize: "sm",
                    color: "text.muted",
                  })}
                >
                  {specimen.valueB}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TypographyScale;
