import type { FC } from "react";
import { css } from "../../../styled-system/css";
import { radii, spacing } from "../../tokens";
import { gridBox, scaleItem } from "./SpacingAndRadii.styles";

const DENSITIES = ["comfortable", "compact"] as const;

/** One panel per density. `data-density` flips the density.* semantic tokens for its subtree. */
const DensityPanel: FC<{ density: (typeof DENSITIES)[number] }> = ({ density }) => (
  <div
    data-density={density}
    data-testid={`density-${density}`}
    className={css({
      flex: "1 1 280px",
      p: "density.cardPad",
      borderRadius: "xl",
      borderWidth: "1px",
      borderStyle: "solid",
      borderColor: "border.subtle",
      backgroundColor: "surface.card",
      display: "flex",
      flexDirection: "column",
      gap: "density.gap",
    })}
  >
    <h3 className={css({ textStyle: "heading.sm", textTransform: "capitalize" })}>{density}</h3>
    {["Monthly overpayment", "Interest rate"].map((label) => (
      <div
        key={label}
        className={css({
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          py: "density.rowPadY",
          borderBottomWidth: "1px",
          borderBottomStyle: "solid",
          borderBottomColor: "border.subtle",
          textStyle: "body.sm",
        })}
      >
        <span>{label}</span>
        <span
          className={css({
            display: "inline-flex",
            alignItems: "center",
            height: "density.control.md",
            px: "density.controlPadX",
            borderRadius: "md",
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: "border.input",
            textStyle: "numeric.sm",
          })}
        >
          {label === "Interest rate" ? "4.60%" : "£200.00"}
        </span>
      </div>
    ))}
  </div>
);

export const SpacingAndRadii: FC = () => {
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
          Spacing, Border Radii & Elevation
        </h1>
        <p className={css({ fontSize: "sm", color: "text.muted", mt: "4px" })}>
          4px Geometric Spacing, Nested Radius Scaling, and Light/Dark Surface Elevation.
        </p>
      </div>

      {/* 4px Spacing Scale */}
      <section className={css({ mb: "36px" })}>
        <h2
          className={css({
            fontFamily: "display",
            fontSize: "lg",
            fontWeight: "semibold",
            mb: "8px",
          })}
        >
          4px Geometric Spacing Scale
        </h2>
        <div className={gridBox()}>
          {Object.entries(spacing).map(([step, val]) => (
            <div key={step} className={scaleItem()}>
              <div
                className={css({
                  backgroundColor: "primary.subtle",
                  borderWidth: "1px",
                  borderStyle: "dashed",
                  borderColor: "primary.border",
                  borderRadius: "xs",
                })}
                style={{ width: val.value, height: "32px", minWidth: "4px" }}
              />
              <span className={css({ fontWeight: "bold", fontSize: "xs" })}>space.{step}</span>
              <span className={css({ fontFamily: "mono", fontSize: "11px", color: "text.muted" })}>
                {val.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Density */}
      <section className={css({ mb: "36px" })}>
        <h2
          className={css({
            fontFamily: "display",
            fontSize: "lg",
            fontWeight: "semibold",
            mb: "8px",
          })}
        >
          Density (Comfortable &amp; Compact)
        </h2>
        <p className={css({ fontSize: "xs", color: "text.muted", mb: "12px" })}>
          Set <code>data-density="compact"</code> on any ancestor for simulators, tables and account
          lists. Touch targets stay at 44px.
        </p>
        <div className={css({ display: "flex", flexWrap: "wrap", gap: "16px" })}>
          {DENSITIES.map((density) => (
            <DensityPanel key={density} density={density} />
          ))}
        </div>
      </section>

      {/* Border Radii */}
      <section className={css({ mb: "36px" })}>
        <h2
          className={css({
            fontFamily: "display",
            fontSize: "lg",
            fontWeight: "semibold",
            mb: "8px",
          })}
        >
          Border Radii Scale
        </h2>
        <div className={gridBox()}>
          {Object.entries(radii).map(([step, val]) => (
            <div key={step} className={scaleItem()}>
              <div
                className={css({
                  width: "56px",
                  height: "56px",
                  backgroundColor: "surface.subtle",
                  borderWidth: "2px",
                  borderStyle: "solid",
                  borderColor: "primary",
                })}
                style={{ borderRadius: val.value }}
              />
              <span className={css({ fontWeight: "bold", fontSize: "xs" })}>radii.{step}</span>
              <span className={css({ fontFamily: "mono", fontSize: "11px", color: "text.muted" })}>
                {val.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Elevation & Shadows */}
      <section>
        <h2
          className={css({
            fontFamily: "display",
            fontSize: "lg",
            fontWeight: "semibold",
            mb: "16px",
          })}
        >
          Elevation & Shadows
        </h2>
        <div
          className={css({
            display: "grid",
            gridTemplateColumns: { base: "1fr", sm: "repeat(3, 1fr)" },
            gap: "20px",
          })}
        >
          <div
            className={css({
              p: "20px",
              borderRadius: "xl",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "border.subtle",
              backgroundColor: "surface.card",
              boxShadow: "card",
            })}
          >
            <h3 className={css({ fontWeight: "bold", fontSize: "sm", mb: "4px" })}>Card Shadow</h3>
            <p className={css({ fontSize: "xs", color: "text.muted" })}>
              Standard resting card elevation across Light and Dark surfaces.
            </p>
          </div>

          <div
            className={css({
              p: "20px",
              borderRadius: "xl",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "border.subtle",
              backgroundColor: "surface.card",
              boxShadow: "cardHover",
            })}
          >
            <h3 className={css({ fontWeight: "bold", fontSize: "sm", mb: "4px" })}>
              Card Hover Shadow
            </h3>
            <p className={css({ fontSize: "xs", color: "text.muted" })}>
              Interactive card hover state with subtle lift.
            </p>
          </div>

          <div
            className={css({
              p: "20px",
              borderRadius: "xl",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "border.subtle",
              backgroundColor: "surface.overlay",
              boxShadow: "floating",
            })}
          >
            <h3 className={css({ fontWeight: "bold", fontSize: "sm", mb: "4px" })}>
              Floating / Modal Shadow
            </h3>
            <p className={css({ fontSize: "xs", color: "text.muted" })}>
              High elevation for popovers, drawers, and modal dialogs.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SpacingAndRadii;
