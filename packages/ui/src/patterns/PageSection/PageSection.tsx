import { type FC, type ReactNode, useId } from "react";
import { cx } from "../../../styled-system/css";
import { SectionHeader, type SectionHeaderProps } from "../SectionHeader/SectionHeader";
import { pageSection } from "./PageSection.styles";

export interface PageSectionProps
  extends Pick<
    SectionHeaderProps,
    "title" | "description" | "icon" | "domain" | "tone" | "as" | "titleAddon" | "action"
  > {
  /** The section's content: a card, a list, a `ResultBlock`. */
  children?: ReactNode;
  /**
   * Id for the heading, when something needs to move focus to it (the heading is always
   * focusable from script). Generated when not given.
   */
  headingId?: string;
  /** Id for the section element (also data-testid). The header takes `{id}-header`. */
  id?: string;
  className?: string;
}

/**
 * One saved section of a page (E17 5A, STYLE-GUIDE 12.5): a `<section>` named by its
 * `SectionHeader`, holding the section's content. Use it for every block under the hero and the
 * KPI strip so sections read as separate. The modelling zone is not one of these: `ScenarioZone`
 * is its own section with its own heading and dashed outline.
 */
export const PageSection: FC<PageSectionProps> = ({
  children,
  id = "page-section",
  headingId: headingIdProp,
  className,
  ...header
}) => {
  const generatedId = useId();
  const headingId = headingIdProp ?? generatedId;
  const slots = pageSection();
  return (
    <section
      aria-labelledby={headingId}
      className={cx(slots.root, className)}
      data-testid={id}
      id={id}
    >
      <SectionHeader {...header} headingId={headingId} id={`${id}-header`} />
      <div className={slots.content}>{children}</div>
    </section>
  );
};

export default PageSection;
