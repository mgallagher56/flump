import { ArrowLeft, ChevronRight } from "lucide-react";
import type { FC, ReactNode } from "react";
import { Icon } from "../../primitives/Icon/Icon";
import {
  crumbCurrent,
  crumbItem,
  crumbLink,
  crumbList,
  crumbSeparator,
} from "./ToolBreadcrumbs.styles";

/** Renders the back link with the app's router; defaults to a plain anchor. */
export type ToolBreadcrumbsRenderLink = (
  href: string,
  className: string,
  children: ReactNode,
) => ReactNode;

export interface ToolBreadcrumbsProps {
  /** The current tool's title (the page h1). */
  title: string;
  /** Where "All calculators" goes. Defaults to `/tools`. */
  href?: string;
  renderLink?: ToolBreadcrumbsRenderLink;
}

const defaultRenderLink: ToolBreadcrumbsRenderLink = (href, className, children) => (
  <a className={className} href={href}>
    {children}
  </a>
);

/**
 * "All calculators" > tool title, one line in both apps (E16 PR 11). Below `sm` only the back
 * link shows; above it the title truncates with an ellipsis rather than wrapping.
 */
export const ToolBreadcrumbs: FC<ToolBreadcrumbsProps> = ({
  title,
  href = "/tools",
  renderLink = defaultRenderLink,
}) => (
  <nav aria-label="Breadcrumb">
    <ol className={crumbList()}>
      <li className={crumbItem()}>
        {renderLink(
          href,
          crumbLink(),
          <>
            <Icon icon={ArrowLeft} size="sm" /> All calculators
          </>,
        )}
        <span aria-hidden="true" className={crumbSeparator()}>
          <Icon icon={ChevronRight} size="sm" />
        </span>
      </li>
      <li aria-current="page" className={crumbCurrent()} title={title}>
        {title}
      </li>
    </ol>
  </nav>
);

export default ToolBreadcrumbs;
