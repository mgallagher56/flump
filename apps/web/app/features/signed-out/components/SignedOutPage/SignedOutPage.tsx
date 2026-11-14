import type { FC, ReactNode } from "react";
import { SignedOutFooter } from "../SignedOutFooter";
import { pageContent, pageRoot } from "./SignedOutPage.styles";

export interface SignedOutPageProps {
  children: ReactNode;
  /** `wide` for the tools index grid, the same width as the marketing index. */
  width?: "default" | "wide";
}

/** Page frame for the public `/tools` pages: centred content column plus the signed-out footer. */
export const SignedOutPage: FC<SignedOutPageProps> = ({ children, width = "default" }) => (
  <div className={pageRoot()}>
    <div className={pageContent({ width })}>{children}</div>
    <SignedOutFooter />
  </div>
);

export default SignedOutPage;
