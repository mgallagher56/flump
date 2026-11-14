import { Button, Icon, IconTile, type IconTileDomain } from "@repo/ui";
import { ArrowRight, Lock, type LucideIcon } from "lucide-react";
import type { FC, ReactNode } from "react";
import { Link } from "react-router";
import { useSampleMode } from "~/context/SampleModeContext";
import {
  widgetCard,
  widgetFigure,
  widgetFooter,
  widgetHeader,
  widgetLabel,
  widgetLine,
  widgetLock,
  widgetTitle,
  widgetUnset,
} from "./WidgetCard.styles";

export interface WidgetCardLink {
  to: string;
  label: string;
}

export interface WidgetCardProps {
  /** Used to build unique ids, e.g. "accounts". */
  id: string;
  /** The section's name, shown as the card heading. */
  title: string;
  icon: LucideIcon;
  /** Picks the icon tile colour (one colour per money domain, E16 P9.3). */
  domain?: IconTileDomain;
  /** What the figure is ("Savings and investments"). */
  label: string;
  /** The card's one figure. `null` shows "Not set" (E16 P3.1). */
  figure: ReactNode | null;
  /** One line of text. It never contains a figure (E16 P1.8). */
  line: string;
  /** The card's one link. In the signed-out sandbox a lock icon replaces it. */
  link: WidgetCardLink;
}

/**
 * One dashboard section card (E16 P1.8): icon tile, one figure, one line of text and one link.
 * Nothing else: no badges, no second figures, no forecasts.
 */
export const WidgetCard: FC<WidgetCardProps> = ({
  id,
  title,
  icon,
  domain,
  label,
  figure,
  line,
  link,
}) => {
  const sample = useSampleMode();
  const cardId = `widget-card-${id}`;
  const titleId = `${cardId}-title`;
  return (
    <section
      aria-labelledby={titleId}
      className={widgetCard()}
      data-section-card={id}
      data-testid={cardId}
      id={cardId}
    >
      <header className={widgetHeader()}>
        <IconTile domain={domain} icon={icon} />
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
          <Button asChild size="sm" variant="ghost">
            <Link data-testid={`${cardId}-link`} to={link.to}>
              {link.label}
              <Icon icon={ArrowRight} size="sm" />
            </Link>
          </Button>
        )}
      </div>
    </section>
  );
};

export default WidgetCard;
