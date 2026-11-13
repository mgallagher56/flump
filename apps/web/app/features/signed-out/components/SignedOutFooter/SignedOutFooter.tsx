import { companyLine } from "@flump/business-details";
import { Heading, Text } from "@repo/ui";
import type { FC } from "react";
import { Link as RouterLink } from "react-router";
import { APP_VERSION, feedbackMailto } from "~/utils/support";
import { TOOL_TILES } from "../../toolsCatalog";
import {
  footerBlurb,
  footerBottom,
  footerGrid,
  footerInner,
  footerLink,
  footerList,
  footerRoot,
} from "./SignedOutFooter.styles";

/** Footer for the public calculator pages. Calculator links follow the catalogue order. */
export const SignedOutFooter: FC = () => (
  <footer className={footerRoot()}>
    <div className={footerInner()}>
      <div className={footerGrid()}>
        <div>
          <Heading as="h2" size="md">
            Flump
          </Heading>
          <Text className={footerBlurb()} color="secondary" textStyle="body.sm">
            UK budget, debt and tax calculators. Estimates for guidance, not advice.
          </Text>
        </div>

        <nav aria-label="Free calculators">
          <Heading as="h3" size="sm">
            Free calculators
          </Heading>
          <ul className={footerList()}>
            {TOOL_TILES.slice(0, 4).map((tool) => (
              <li key={tool.slug}>
                <RouterLink className={footerLink()} to={`/tools/${tool.slug}`}>
                  {tool.shortTitle}
                </RouterLink>
              </li>
            ))}
            <li>
              <RouterLink className={footerLink()} to="/tools">
                All calculators
              </RouterLink>
            </li>
          </ul>
        </nav>

        <nav aria-label="Account and support">
          <Heading as="h3" size="sm">
            Account and support
          </Heading>
          <ul className={footerList()}>
            <li>
              <RouterLink className={footerLink()} to="/signup">
                Sign up
              </RouterLink>
            </li>
            <li>
              <RouterLink className={footerLink()} to="/login">
                Sign in
              </RouterLink>
            </li>
            <li>
              <a className={footerLink()} href={feedbackMailto("tools", APP_VERSION)}>
                Send feedback
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className={footerBottom()}>{companyLine(new Date().getFullYear())}</div>
    </div>
  </footer>
);

export default SignedOutFooter;
