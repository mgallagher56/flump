import { HomeLogo, VisuallyHidden } from "@repo/ui";
import type { FC, ReactNode } from "react";
import { renderHomeLogoLink } from "~/components/navigation/renderHomeLogoLink";
import { shellHeader, shellMain, shellRoot } from "./ErrorShell.styles";

export interface ErrorShellProps {
  children: ReactNode;
}

/**
 * Minimal branded shell for the root error boundary, which replaces the whole document and so
 * cannot reuse the app shell: skip link, logo header, then the error state in the main landmark.
 */
export const ErrorShell: FC<ErrorShellProps> = ({ children }) => (
  <div className={shellRoot()}>
    <VisuallyHidden as="a" focusable href="#main-content">
      Skip to content
    </VisuallyHidden>
    <header className={shellHeader()}>
      <HomeLogo renderLink={renderHomeLogoLink} />
    </header>
    <main id="main-content" tabIndex={-1} className={shellMain()}>
      {children}
    </main>
  </div>
);
