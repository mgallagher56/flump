import { BUSINESS_DETAILS } from "@flump/business-details";
import type { FC } from "react";
import {
  disclosureBody,
  disclosureCard,
  disclosureList,
  disclosureTitle,
} from "./DisclosurePolicySection.styles";

/** Short vulnerability-disclosure policy. Makes no response-time or legal-safe-harbour promise. */
const contact = BUSINESS_DETAILS.securityContact.value;

export const DisclosurePolicySection: FC = () => (
  <section className={disclosureCard()} aria-labelledby="disclosure-policy-heading">
    <h2 id="disclosure-policy-heading" className={disclosureTitle()}>
      Reporting a security issue
    </h2>
    <p className={disclosureBody()}>
      If you think you have found a vulnerability in Flump, we would like to hear about it. Email{" "}
      <a href={`mailto:${contact}`}>{contact}</a>
      {BUSINESS_DETAILS.securityContact.isPlaceholder
        ? " (a placeholder address while we finish setting up, so it is not monitored yet)"
        : ""}
      . Please hold off sharing details publicly until we have had a chance to respond.
    </p>
    <ul className={disclosureList()}>
      <li>Describe what you found and the steps to reproduce it.</li>
      <li>Please do not access, change or delete data that belongs to other people.</li>
      <li>Please do not run tests that could degrade the service for others.</li>
      <li>We do not run a paid bug bounty programme.</li>
    </ul>
  </section>
);
