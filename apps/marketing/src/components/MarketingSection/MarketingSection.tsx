import { cx } from "@repo/ui/styled-system/css";
import type { FC, ReactNode } from "react";
import {
  marketingSection,
  marketingSectionHeader,
  marketingSectionInner,
  marketingSectionSubtitle,
  marketingSectionTitle,
} from "./MarketingSection.styles";

export type MarketingSectionTone = "canvas" | "subtle" | "sage" | "apricot";

export interface MarketingSectionProps {
  /** Anchor id. The title gets `${id}-title` and labels the section. */
  id: string;
  title?: string;
  subtitle?: ReactNode;
  tone?: MarketingSectionTone;
  /** `compact` trims the vertical padding, for a short strip. */
  size?: "default" | "compact";
  /** `narrow` caps the content at reading width (FAQ, final call to action). */
  width?: "wide" | "narrow";
  align?: "start" | "center";
  children?: ReactNode;
  /** Id of a heading inside `children` that names the section, when `title` is not used. */
  labelledBy?: string;
  className?: string;
  "data-testid"?: string;
}

/**
 * One marketing band: an optional h2 and one-line subtitle over the section's content. No eyebrow,
 * no index pill and no monospace (E16 PR 12). Use at most one sage and one apricot band per page.
 */
export const MarketingSection: FC<MarketingSectionProps> = ({
  id,
  title,
  subtitle,
  tone = "canvas",
  size = "default",
  width = "wide",
  align = "start",
  children,
  labelledBy,
  className,
  "data-testid": testId,
}) => (
  <section
    aria-labelledby={title ? `${id}-title` : labelledBy}
    className={cx(marketingSection({ tone, size }), className)}
    data-testid={testId}
    data-tone-band={tone}
    id={id}
  >
    <div className={marketingSectionInner({ width })}>
      {(title || subtitle) && (
        <div className={marketingSectionHeader({ align })}>
          {title && (
            <h2 className={marketingSectionTitle()} id={`${id}-title`}>
              {title}
            </h2>
          )}
          {subtitle && <p className={marketingSectionSubtitle()}>{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  </section>
);

export default MarketingSection;
