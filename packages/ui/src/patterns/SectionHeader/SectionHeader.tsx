import type { LucideIcon } from "lucide-react";
import type { FC, ReactNode } from "react";
import { cx } from "../../../styled-system/css";
import { Heading, type HeadingElement } from "../../primitives/Heading/Heading";
import { IconTile, type IconTileDomain, type IconTileTone } from "../../primitives/IconTile";
import { sectionHeader } from "./SectionHeader.styles";

export interface SectionHeaderProps {
  /** Sentence case, names the section: "Where your money goes". */
  title: string;
  /** One line saying what the section is. Never a figure (figures belong in the section). */
  description?: ReactNode;
  /** A Lucide icon for the tile. The tile is decorative: the title names the section. */
  icon: LucideIcon;
  /** Tile colour from the area map. Ignored when `tone` is given. */
  domain?: IconTileDomain;
  /** Explicit tile colour. `accent` is the E17 Damson, for sections outside the areas. */
  tone?: IconTileTone;
  /** Heading level. Defaults to `h2`: sections sit directly under the page title. */
  as?: Exclude<HeadingElement, "h1">;
  /** Id for the heading, so the section can point `aria-labelledby` at it. */
  headingId?: string;
  /** Sits beside the title: a badge or an info tip. */
  titleAddon?: ReactNode;
  /** At most one quiet action at the end of the row (an outline "Edit" button, a link). */
  action?: ReactNode;
  /** Id for the root element (also data-testid). */
  id?: string;
  className?: string;
}

/**
 * Opens every section on a page (E17 5A, STYLE-GUIDE 12.5): an icon tile, a title and one line
 * saying what the section is. With the 36px section gap in `PageBody` it makes each section read as
 * its own block.
 */
export const SectionHeader: FC<SectionHeaderProps> = ({
  title,
  description,
  icon,
  domain,
  tone,
  as = "h2",
  headingId,
  titleAddon,
  action,
  id = "section-header",
  className,
}) => {
  const slots = sectionHeader();
  return (
    <div className={cx(slots.root, className)} data-testid={id} id={id}>
      <IconTile domain={domain} icon={icon} tone={tone} />
      <div className={slots.text}>
        <div className={slots.titleRow}>
          {/* Focusable from script only, so "Update your details" can land on the section. */}
          <Heading as={as} id={headingId} size="md" tabIndex={-1}>
            {title}
          </Heading>
          {titleAddon}
        </div>
        {description ? <p className={slots.description}>{description}</p> : null}
      </div>
      {action ? <div className={slots.action}>{action}</div> : null}
    </div>
  );
};

export default SectionHeader;
