import { Icon } from "@repo/ui";
import { ArrowLeft, ChevronRight } from "lucide-react";
import type { FC } from "react";
import { Link as RouterLink } from "react-router";
import { crumbCurrent, crumbItem, crumbLink, crumbList } from "./ToolBreadcrumbs.styles";

export interface ToolBreadcrumbsProps {
  category: string;
  title: string;
}

export const ToolBreadcrumbs: FC<ToolBreadcrumbsProps> = ({ category, title }) => (
  <nav aria-label="Breadcrumb">
    <ol className={crumbList()}>
      <li className={crumbItem()}>
        <RouterLink className={crumbLink()} to="/tools">
          <Icon icon={ArrowLeft} size="sm" /> All calculators
        </RouterLink>
        <Icon icon={ChevronRight} size="sm" />
      </li>
      <li className={crumbItem()}>
        {category}
        <Icon icon={ChevronRight} size="sm" />
      </li>
      <li aria-current="page" className={crumbCurrent()}>
        {title}
      </li>
    </ol>
  </nav>
);

export default ToolBreadcrumbs;
