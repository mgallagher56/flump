import { type AppNavRenderLink, Icon } from "@repo/ui";
import { Lock } from "lucide-react";
import { Link } from "react-router";

export interface RenderNavLinkOptions {
  /** Keys rendered as disabled "Sign up to open" buttons (signed-out sandbox). */
  disabledKeys?: ReadonlySet<string>;
  disabledLabel?: string;
  /** Key of the entry that renders as a button, not a link (the bottom bar "More"). */
  buttonKey?: string;
  onButtonClick?: () => void;
  buttonLabel?: string;
  buttonExpanded?: boolean;
  /** Called after a link is followed (closes a flyout/drawer). */
  onNavigate?: () => void;
}

/** `renderLink` for the @repo/ui nav patterns: react-router `Link`, forwarding `aria-current`. */
export const createRenderNavLink =
  ({
    disabledKeys,
    disabledLabel = "Sign up to open",
    buttonKey,
    onButtonClick,
    buttonLabel,
    buttonExpanded,
    onNavigate,
  }: RenderNavLinkOptions = {}): AppNavRenderLink =>
  (item, className, children, ariaCurrent) => {
    if (buttonKey && item.key === buttonKey) {
      return (
        <button
          aria-expanded={buttonExpanded}
          aria-label={buttonLabel}
          className={className}
          id={`nav-${item.key}`}
          type="button"
          onClick={onButtonClick}
        >
          {children}
        </button>
      );
    }
    if (disabledKeys?.has(item.key)) {
      return (
        <button
          aria-disabled="true"
          aria-label={`${item.label}: ${disabledLabel}`}
          className={className}
          data-sample-disabled="true"
          id={`nav-${item.key}-disabled`}
          title={disabledLabel}
          type="button"
          onClick={(event) => event.preventDefault()}
        >
          {children}
          <Icon icon={Lock} size="sm" />
        </button>
      );
    }
    return (
      <Link aria-current={ariaCurrent} className={className} to={item.href} onClick={onNavigate}>
        {children}
      </Link>
    );
  };
