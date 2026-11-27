import type { FC, ReactNode } from "react";
import { AmbientMotionProvider } from "../../context/AmbientMotionContext";
import { shell } from "./MarketingPageShell.styles";

export interface MarketingPageShellProps {
  children: ReactNode;
}

/**
 * The shell of any marketing page with ambient motion: the ambient motion provider (so the bubble
 * fields, the orb and every `useGsapMoment` honour the page's pause control, MK14) around the page
 * column. Put the header, `main` and the footer inside it.
 */
export const MarketingPageShell: FC<MarketingPageShellProps> = ({ children }) => (
  <AmbientMotionProvider>
    <div className={shell} data-page-shell="">
      {children}
    </div>
  </AmbientMotionProvider>
);
