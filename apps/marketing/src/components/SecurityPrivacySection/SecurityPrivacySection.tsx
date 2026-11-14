import { IconTile } from "@repo/ui";
import { ShieldCheck } from "lucide-react";
import type { FC } from "react";
import { Link } from "react-router-dom";
import { MarketingSection } from "../MarketingSection";
import {
  stripBody,
  stripLink,
  stripRow,
  stripText,
  stripTitle,
} from "./SecurityPrivacySection.styles";

/**
 * The home page's short security strip (E16 PR 12, D13): one sentence of facts on a tinted band and
 * a link to `/security`, which holds the detail. It promises no feature that does not exist today.
 */
export const SecurityPrivacySection: FC = () => (
  <MarketingSection
    data-testid="security-privacy-section"
    id="security"
    labelledBy="security-title"
    size="compact"
    tone="subtle"
  >
    <div className={stripRow()}>
      <IconTile icon={ShieldCheck} tone="neutral" />
      <div className={stripText()}>
        <h2 className={stripTitle()} id="security-title">
          Security and privacy
        </h2>
        <p className={stripBody()}>
          You type in your own figures, so no bank login is needed. Flump has no feature to make
          payments or move money.
        </p>
      </div>
      <Link className={stripLink()} to="/security">
        What Flump can and cannot do
      </Link>
    </div>
  </MarketingSection>
);

export default SecurityPrivacySection;
