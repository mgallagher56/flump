import type { FC, ReactNode } from "react";
import { css, cx, type RecipeVariantProps } from "../../../styled-system/css";
import {
  indexBadgeRecipe,
  sectionBandRecipe,
  sectionSubtitleRecipe,
  sectionTitleRecipe,
} from "./SectionBand.styles";

export type SectionBandVariants = RecipeVariantProps<typeof sectionBandRecipe>;
export type SectionBandTone = "canvas" | "subtle" | "tinted" | "contrast";

export interface SectionBandProps extends SectionBandVariants {
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
  const isContrast = tone === "contrast";

  return (
    <section id={id} className={cx(sectionBandRecipe({ tone }), className)}>
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
