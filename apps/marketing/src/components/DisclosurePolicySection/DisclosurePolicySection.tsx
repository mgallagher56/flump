import type { FC } from "react";
import {
  disclosureBody,
  disclosureCard,
  disclosureList,
  disclosureTitle,
} from "./DisclosurePolicySection.styles";

/** Short vulnerability-disclosure policy. Makes no response-time or legal-safe-harbour promise. */
export const DisclosurePolicySection: FC = () => (
  <section className={disclosureCard()} aria-labelledby="disclosure-policy-heading">
    <h2 id="disclosure-policy-heading" className={disclosureTitle()}>
      Reporting a security issue
    </h2>
    <p className={disclosureBody()}>
      If you think you have found a vulnerability in Flump, we would like to hear about it. A
      security contact is not available yet and will be published here at launch. Until then, please
      hold off sharing details publicly.
    </p>
    <ul className={disclosureList()}>
      <li>When a contact is published, describe what you found and the steps to reproduce it.</li>
      <li>Please do not access, change or delete data that belongs to other people.</li>
      <li>Please do not run tests that could degrade the service for others.</li>
      <li>We do not run a paid bug bounty programme.</li>
    </ul>
  </section>
);
