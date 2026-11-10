import type { FC, ReactNode } from "react";
import { cx } from "../../../styled-system/css";
import { pageHeaderContainer, pageHeaderSubtitle, pageHeaderTitle } from "./PageHeader.styles";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export const PageHeader: FC<PageHeaderProps> = ({ title, subtitle, actions, className }) => {
  return (
    <header className={cx(pageHeaderContainer(), className)}>
      <div>
        <h1 className={pageHeaderTitle()}>{title}</h1>
        {subtitle && <p className={pageHeaderSubtitle()}>{subtitle}</p>}
      </div>
      {actions && <div>{actions}</div>}
    </header>
  );
};

export default PageHeader;
