import { type FC, useId } from "react";
import { cx } from "../../../styled-system/css";
import { floorLayout, LOGO_FLOOR, LOGO_ORBS, LOGO_VIEWBOX, orbLayout } from "./FlumpLogo.art";
import { flumpLogoRecipe, logoClasses, logoOpacity, logoStop } from "./FlumpLogo.styles";

export interface FlumpLogoProps {
  size?: "sm" | "md" | "lg";
  /** Accessible name. Leave unset when the logo sits inside a link or button that is already named. */
  label?: string;
  id?: string;
}

const floor = floorLayout(LOGO_FLOOR);

/**
 * The Flump logo: three glass bubbles over one floor shadow ("K2", FlumpLogo.art.ts). Inline so it
 * follows the light and dark themes through the logo tokens. Static: no motion.
 */
export const FlumpLogo: FC<FlumpLogoProps> = ({ size = "md", label, id }) => {
  const uid = `flump-logo-${useId().replace(/[^\w-]/g, "")}`;
  const labelled = Boolean(label);

  return (
    <svg
      id={id}
      data-testid={id}
      className={flumpLogoRecipe({ size })}
      viewBox={LOGO_VIEWBOX}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={labelled ? undefined : true}
      aria-label={label}
      focusable="false"
      role={labelled ? "img" : "presentation"}
    >
      <defs>
        <radialGradient id={`${uid}-contact`}>
          <stop className={logoStop.shadow} offset="0" stopOpacity="0.75" />
          <stop className={logoStop.shadow} offset="0.6" stopOpacity="0.4" />
          <stop className={logoStop.shadow} offset="1" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-pool`}>
          <stop className={logoStop.teal} offset="0" stopOpacity="0.5" />
          <stop className={logoStop.teal} offset="0.45" stopOpacity="0.2" />
          <stop className={logoStop.teal} offset="1" stopOpacity="0" />
        </radialGradient>
        {LOGO_ORBS.map((orb, i) => {
          const { body, rim, sheen } = orbLayout(orb);
          return [
            <radialGradient
              key="body"
              id={`${uid}-${i}-body`}
              gradientUnits="userSpaceOnUse"
              cx={body.cx}
              cy={body.cy}
              r={body.r}
            >
              <stop className={cx(logoStop[orb.tone], logoOpacity.core)} offset="0" />
              <stop className={cx(logoStop[orb.tone], logoOpacity.mid)} offset="0.62" />
              <stop className={logoStop[orb.tone]} offset="1" />
            </radialGradient>,
            <radialGradient
              key="rim"
              id={`${uid}-${i}-rim`}
              gradientUnits="userSpaceOnUse"
              cx={rim.cx}
              cy={rim.cy}
              r={rim.r}
            >
              <stop className={logoStop[orb.light]} offset="0" stopOpacity="0.95" />
              <stop className={logoStop[orb.light]} offset="0.55" stopOpacity="0.35" />
              <stop className={logoStop[orb.light]} offset="1" stopOpacity="0" />
            </radialGradient>,
            <radialGradient
              key="sheen"
              id={`${uid}-${i}-sheen`}
              gradientUnits="userSpaceOnUse"
              cx={sheen.cx}
              cy={sheen.cy}
              r={sheen.r}
            >
              <stop className={cx(logoStop.glint, logoOpacity.sheen)} offset="0" />
              <stop className={logoStop.glint} offset="1" stopOpacity="0" />
            </radialGradient>,
          ];
        })}
      </defs>
      <ellipse className={logoClasses.floorLight} {...floor.light} />
      <g className={logoClasses.floorDark}>
        <ellipse {...floor.contact} fill={`url(#${uid}-contact)`} />
        <ellipse {...floor.pool} fill={`url(#${uid}-pool)`} />
      </g>
      {/* The lights all sit inside the bubble, so each paints a circle and needs no clip path. */}
      {LOGO_ORBS.map((orb, i) => {
        const { glint } = orbLayout(orb);
        const circle = { cx: orb.cx, cy: orb.cy, r: orb.r };
        return (
          <g key={`${orb.cx}-${orb.cy}`} data-tone={orb.tone}>
            <circle className={logoClasses.backing} {...circle} />
            <circle {...circle} fill={`url(#${uid}-${i}-body)`} />
            <circle {...circle} fill={`url(#${uid}-${i}-rim)`} />
            <circle {...circle} fill={`url(#${uid}-${i}-sheen)`} />
            {orb.glint ? <ellipse className={logoClasses.glint} {...glint} /> : null}
          </g>
        );
      })}
    </svg>
  );
};

export default FlumpLogo;
