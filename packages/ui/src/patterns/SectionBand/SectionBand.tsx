import type { FC, ReactNode } from "react";
import { cx } from "../../../styled-system/css";
import {
  appBandRecipe,
  appHeadingGroup,
  appSubtitleRecipe,
  appTitleRecipe,
  sectionBandHeader,
  sectionBandInner,
  sectionBandRecipe,
  sectionBandSubtitle,
  sectionBandTitle,
} from "./SectionBand.styles";

export type SectionBandTone = "canvas" | "subtle" | "sage" | "apricot";

export interface SectionBandProps {
  /** Anchor id. The title gets `${id}-title` and labels the section. */
  id?: string;
  /**
   * `marketing` (default) is the full-width band with an h2 and one-line subtitle.
   * `app` is the in-product section heading: left-aligned sentence-case title with a muted
   * one-line description, no band padding and no tone.
   */
  variant?: "marketing" | "app";
  /** Marketing only. At most one sage and one apricot band per page. */
  tone?: SectionBandTone;
  /** Marketing only. `compact` trims the vertical padding, for a short strip. */
  size?: "default" | "compact";
  /** Marketing only. `narrow` caps the content at reading width (FAQ, final call to action). */
  width?: "wide" | "narrow";
  /** Marketing only. */
  align?: "start" | "center";
  title?: string;
  /** Muted description under the title. */
  subtitle?: ReactNode;
  /** Id of a heading inside `children` that names the section, when `title` is not used. */
  labelledBy?: string;
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

/**
 * One section of a page. The marketing site's `MarketingSection` is this band (variant
 * `marketing`); in the app, use variant `app` for a plain section heading.
 */
export const SectionBand: FC<SectionBandProps> = ({
  id,
  variant = "marketing",
  tone = "canvas",
  size = "default",
  width = "wide",
  align = "start",
  title,
  subtitle,
  labelledBy,
  children,
  className,
  "data-testid": testId,
}) => {
  const titleId = id && title ? `${id}-title` : undefined;
  const labelId = titleId ?? labelledBy;

  if (variant === "app") {
    return (
      <section
        aria-labelledby={labelId}
        className={cx(appBandRecipe(), className)}
        data-testid={testId}
        id={id}
      >
        {(title || subtitle) && (
          <div className={appHeadingGroup()}>
            {title && (
              <h2 className={appTitleRecipe()} id={titleId}>
                {title}
              </h2>
            )}
            {subtitle && <p className={appSubtitleRecipe()}>{subtitle}</p>}
          </div>
        )}
        {children}
      </section>
    );
  }

  return (
    <section
      aria-labelledby={labelId}
      className={cx(sectionBandRecipe({ tone, size }), className)}
      data-testid={testId}
      data-tone-band={tone}
      id={id}
    >
      <div className={sectionBandInner({ width })}>
        {(title || subtitle) && (
          <div className={sectionBandHeader({ align })}>
            {title && (
              <h2 className={sectionBandTitle()} id={titleId}>
                {title}
              </h2>
            )}
            {subtitle && <p className={sectionBandSubtitle()}>{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
};

export default SectionBand;
