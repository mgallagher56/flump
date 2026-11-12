import { type FC, useId } from "react";
import { flumpLogoRecipe, logoClasses } from "./FlumpLogo.styles";

export interface FlumpLogoProps {
  size?: "sm" | "md" | "lg";
  /** Accessible name. Leave unset when the logo sits inside a link or button that is already named. */
  label?: string;
  id?: string;
}

/** The Flump blob. Inline so it follows the light and dark themes through the primary tokens. */
export const FlumpLogo: FC<FlumpLogoProps> = ({ size = "md", label, id }) => {
  const uid = useId().replace(/:/g, "");
  const gradientId = `flump-logo-body-${uid}`;
  const labelled = Boolean(label);

  return (
    <svg
      id={id}
      data-testid={id}
      className={flumpLogoRecipe({ size })}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={labelled ? undefined : true}
      aria-label={label}
      focusable="false"
      role={labelled ? "img" : "presentation"}
    >
      <defs>
        <radialGradient cx="42%" cy="30%" id={gradientId} r="75%">
          <stop className={logoClasses.bodyTop} offset="0" />
          <stop className={logoClasses.bodyBottom} offset="1" />
        </radialGradient>
      </defs>
      <ellipse className={logoClasses.shadow} cx="100" cy="168" rx="62" ry="9" />
      <path
        d="M100 38c36 0 64 30 64 66 0 36-20 62-64 62s-64-26-64-62c0-36 28-66 64-66z"
        fill={`url(#${gradientId})`}
      />
      <path
        className={logoClasses.highlight}
        d="M78 52c14-9 38-9 50 3-14-3-34-1-50-3z"
        opacity="0.6"
      />
      <path
        className={logoClasses.highlight}
        d="M52 92c4-16 16-28 28-34-8 12-8 22-12 34 2 14 8 24 6 32-12-8-26-18-22-32z"
        opacity="0.4"
      />
      <path
        className={logoClasses.highlight}
        d="M146 82c8 10 12 24 8 40-6-8-10-20-8-40z"
        opacity="0.25"
      />
    </svg>
  );
};

export default FlumpLogo;
