import type { FC, ReactNode } from "react";
import { cx, type RecipeVariantProps } from "../../../styled-system/css";
import {
  appBandRecipe,
  appHeadingGroup,
  appSubtitleRecipe,
  appTitleRecipe,
  indexBadgeRecipe,
  marketingHeaderRecipe,
  marketingInnerRecipe,
  sectionBandRecipe,
  sectionSubtitleRecipe,
  sectionTitleRecipe,
} from "./SectionBand.styles";

export type SectionBandVariants = RecipeVariantProps<typeof sectionBandRecipe>;
export type SectionBandTone = "canvas" | "subtle" | "tinted" | "contrast";

export interface SectionBandProps extends SectionBandVariants {
  id?: string;
  tone?: SectionBandTone;
  /**
   * `marketing` (default) is the full-width centred band with a large title.
   * `app` is the in-product section heading: left-aligned plain sentence-case title with a muted
   * one-line description, no band padding.
   */
  variant?: "marketing" | "app";
  indexBadge?: string;
  title?: string;
  /** Muted description under the title. */
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export const SectionBand: FC<SectionBandProps> = ({
  id,
  tone = "canvas",
  variant = "marketing",
  indexBadge,
  title,
  subtitle,
  children,
  className,
}) => {
  if (variant === "app") {
    return (
      <section
        aria-labelledby={id && title ? `${id}-title` : undefined}
        className={cx(appBandRecipe(), className)}
        id={id}
      >
        {(title || subtitle) && (
          <div className={appHeadingGroup()}>
            {title && (
              <h2 className={appTitleRecipe()} id={id ? `${id}-title` : undefined}>
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

  const isContrast = tone === "contrast";

  return (
    <section id={id} className={cx(sectionBandRecipe({ tone }), className)}>
      <div className={marketingInnerRecipe()}>
        {(indexBadge || title || subtitle) && (
          <div className={marketingHeaderRecipe()}>
            {indexBadge && (
              <span className={indexBadgeRecipe({ contrast: isContrast })}>{indexBadge}</span>
            )}
            {title && <h2 className={sectionTitleRecipe({ contrast: isContrast })}>{title}</h2>}
            {subtitle && (
              <p className={sectionSubtitleRecipe({ contrast: isContrast })}>{subtitle}</p>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
};

export default SectionBand;
