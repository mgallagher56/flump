import type { FC } from "react";
import { css } from "../../../styled-system/css";
import { elevationShadows } from "../../tokens";
import { elevationCard, elevationGrid } from "./Elevation.styles";

const LEVELS = [
  { level: "xs", use: "Hairline lift for chips and inputs." },
  { level: "card", use: "Resting cards and panels." },
  { level: "raised", use: "Hover and drag states." },
  { level: "overlay", use: "Menus, popovers, dialogs." },
  { level: "focus", use: "Two-ring focus halo for custom controls." },
] as const;

export const Elevation: FC = () => (
  <div
    className={css({
      p: { base: "16px", md: "24px" },
      backgroundColor: "surface.canvas",
      color: "text.primary",
      minHeight: "100%",
    })}
  >
    <h1 className={css({ textStyle: "heading.lg", mb: "4px" })}>Elevation</h1>
    <p className={css({ textStyle: "body.sm", color: "text.muted", mb: "24px" })}>
      Light mode uses soft ink-tinted shadows. Dark mode lifts by lighter surface plus a hairline
      highlight, with only a modest shadow.
    </p>
    <div className={elevationGrid()}>
      {LEVELS.map(({ level, use }) => (
        <div key={level} className={elevationCard({ level })} data-testid={`elevation-${level}`}>
          <h2 className={css({ textStyle: "label.md" })}>{level}</h2>
          <p className={css({ textStyle: "body.sm", color: "text.secondary", mt: "4px" })}>{use}</p>
          <code className={css({ fontFamily: "mono", fontSize: "xs", color: "text.muted" })}>
            shadows.{level}
          </code>
        </div>
      ))}
    </div>
    <p className={css({ textStyle: "label.sm", color: "text.muted", mt: "24px" })}>
      {Object.keys(elevationShadows).length} shadow tokens, each defined for light and dark.
    </p>
  </div>
);

export default Elevation;
