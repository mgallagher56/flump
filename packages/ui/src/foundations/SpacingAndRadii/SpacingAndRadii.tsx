import type { FC } from "react";
import { css } from "../../../styled-system/css";
import { radii, spacing } from "../../tokens";
import { gridBox, scaleItem } from "./SpacingAndRadii.styles";

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
