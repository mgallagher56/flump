import type { FC, ReactNode } from "react";
import { SignedOutFooter } from "../SignedOutFooter";
import { pageContent, pageRoot } from "./SignedOutPage.styles";

export interface SignedOutPageProps {
  children: ReactNode;
}

/** Page frame for the public `/tools` pages: centred content column plus the signed-out footer. */
export const SignedOutPage: FC<SignedOutPageProps> = ({ children }) => (
  <div className={pageRoot()}>
    <div className={pageContent()}>{children}</div>
    <SignedOutFooter />
  </div>
);

export default SignedOutPage;
