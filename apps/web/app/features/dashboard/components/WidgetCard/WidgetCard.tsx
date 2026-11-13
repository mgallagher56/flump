import { Button, Icon } from "@repo/ui";
import { ArrowRight, EyeOff, type LucideIcon } from "lucide-react";
import type { FC, ReactNode } from "react";
import { SampleAwareLink } from "~/components/navigation/SampleAwareLink";
import {
  widgetActions,
  widgetBody,
  widgetCard,
  widgetHeader,
  widgetTitle,
  widgetTitleRow,
} from "./WidgetCard.styles";

export interface WidgetCardProps {
  title: string;
  icon: LucideIcon;
  /** Where the "Open" link goes. */
  href: string;
  children: ReactNode;
  /** When provided, a labelled hide button is rendered. */
  onHide?: () => void;
  /** Used to build unique ids, e.g. "accounts". */
  id: string;
}

/** The shell around a dashboard widget: title, Lucide icon, Open link, content slot, optional hide. */
export const WidgetCard: FC<WidgetCardProps> = ({ title, icon, href, children, onHide, id }) => {
  const cardId = `widget-card-${id}`;
  return (
    <section
      aria-labelledby={`${cardId}-title`}
      className={widgetCard()}
      data-density="compact"
      data-testid={cardId}
      id={cardId}
    >
      <header className={widgetHeader()}>
        <div className={widgetTitleRow()}>
          <Icon icon={icon} size="md" />
          <h2 className={widgetTitle()} data-testid={`${cardId}-title`} id={`${cardId}-title`}>
            {title}
          </h2>
        </div>
        <div className={widgetActions()}>
          <Button asChild size="sm" variant="ghost">
            <SampleAwareLink
              aria-label={`Open ${title}`}
              sampleAriaLabel={`Sign up to open ${title}`}
              sampleLabel="Sign up to open"
              to={href}
            >
              Open
              <Icon icon={ArrowRight} size="sm" />
            </SampleAwareLink>
          </Button>
          {onHide ? (
            <Button
              aria-label={`Hide ${title}`}
              id={`${cardId}-hide`}
              size="sm"
              variant="ghost"
              onClick={onHide}
            >
              <Icon icon={EyeOff} size="sm" />
            </Button>
          ) : null}
        </div>
      </header>
      <div className={widgetBody()}>{children}</div>
    </section>
  );
};
