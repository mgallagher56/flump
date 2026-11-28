import type { FC, ReactNode } from "react";
import { shell } from "./MarketingPageShell.styles";

export interface MarketingPageShellProps {
  children: ReactNode;
}

/**
 * The shell of any marketing page with ambient motion: the page column. Put the header, `main`
 * and the footer inside it. Ambient motion stops with reduced motion, from the system setting or
 * the header's "Reduce motion" (MK14), which every part reads through `usePrefersReducedMotion`.
 */
export const MarketingPageShell: FC<MarketingPageShellProps> = ({ children }) => (
  <div className={shell} data-page-shell="">
    {children}
  </div>
);
