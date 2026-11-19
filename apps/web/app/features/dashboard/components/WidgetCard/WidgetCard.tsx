import { Icon, IconTile } from "@repo/ui";
import { ArrowRight, Lock, type LucideIcon } from "lucide-react";
import type { FC, ReactNode } from "react";
import { Link } from "react-router";
import { useSampleMode } from "~/context/SampleModeContext";
import type { DashboardWidgetKey } from "~/utils/pageConfig";
import { SECTION_COLOURS, SECTION_TILE_TONE } from "../../sectionColours";
import {
  widgetCard,
  widgetFigure,
  widgetFooter,
  widgetHeader,
  widgetLabel,
  widgetLine,
  widgetLink,
  widgetLock,
  widgetTitle,
  widgetUnset,
} from "./WidgetCard.styles";

export interface WidgetCardLink {
  to: string;
  label: string;
}

export interface WidgetCardProps {
  /** The section, e.g. "accounts". Builds the ids and picks the section's colour. */
  id: DashboardWidgetKey;
  /** The section's name, shown as the card heading. */
  title: string;
  icon: LucideIcon;
  /** What the figure is ("Savings and investments"). */
  label: string;
  /** The card's one figure. `null` shows "Not set" (E16 P3.1). */
  figure: ReactNode | null;
  /**
   * One line of text. It carries no figure (E16 P1.8), with one owner exception: the budget card's
   * "Breathing room: about 1.5 months" (15 November 2026).
   */
  line: ReactNode;
  /** The card's one link. In the signed-out sandbox a lock icon replaces it. */
  link: WidgetCardLink;
}

/**
 * One dashboard section card (E16 P1.8): icon tile, one figure, one line of text and one link,
 * in its section's colour (a top edge and the tile).
 * Nothing else: no badges, no second figures, no forecasts.
 */
export const WidgetCard: FC<WidgetCardProps> = ({ id, title, icon, label, figure, line, link }) => {
  const sample = useSampleMode();
  const cardId = `widget-card-${id}`;
  const titleId = `${cardId}-title`;
  // One colour per section, on the top edge and the icon tile (see sectionColours.ts).
  const colour = SECTION_COLOURS[id];
  return (
    <section
      aria-labelledby={titleId}
      className={widgetCard({ colour, interactive: !sample })}
      data-section-card={id}
      data-section-colour={colour}
      data-testid={cardId}
      id={cardId}
    >
      <header className={widgetHeader()}>
        <IconTile colouredIcon icon={icon} tone={SECTION_TILE_TONE[colour]} />
        <h3 className={widgetTitle()} data-testid={titleId} id={titleId}>
          {title}
        </h3>
      </header>
      <p className={widgetLabel()}>{label}</p>
      {figure === null ? (
        <p className={widgetUnset()} data-unknown="true">
          Not set
        </p>
      ) : (
        <p className={widgetFigure()}>{figure}</p>
      )}
      <p className={widgetLine()}>{line}</p>
      <div className={widgetFooter()}>
        {sample ? (
          <span
            aria-label="Locked in this example"
            className={widgetLock()}
            data-testid={`${cardId}-locked`}
            role="img"
          >
            <Icon icon={Lock} size="sm" />
          </span>
        ) : (
          <Link
            className={widgetLink()}
            data-testid={`${cardId}-link`}
            id={`${cardId}-link`}
            to={link.to}
          >
            {link.label}
            <Icon icon={ArrowRight} size="sm" />
          </Link>
        )}
      </div>
    </section>
  );
};

export default WidgetCard;
