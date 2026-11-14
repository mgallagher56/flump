import { BUSINESS_DETAILS } from "@flump/business-details";
import type { FC } from "react";
import {
  disclosureBody,
  disclosureLink,
  disclosureList,
  disclosurePlaceholder,
  disclosureSection,
  disclosureTitle,
} from "./DisclosurePolicySection.styles";

const contact = BUSINESS_DETAILS.securityContact.value;

/**
 * Short vulnerability-disclosure policy. The contact is one line with the address as a link (the
 * placeholder stays until the domain exists, E7 D4). Makes no response-time or legal-safe-harbour
 * promise.
 */
export const DisclosurePolicySection: FC = () => (
  <section aria-labelledby="disclosure-policy-heading" className={disclosureSection()}>
    <h2 className={disclosureTitle()} id="disclosure-policy-heading">
      Reporting a security issue
    </h2>
    <p className={disclosureBody()}>
      Email{" "}
      <a className={disclosureLink()} href={`mailto:${contact}`}>
        {contact}
      </a>
      {BUSINESS_DETAILS.securityContact.isPlaceholder ? (
        <span className={disclosurePlaceholder()}>
          {" "}
          (a placeholder address while we finish setting up, so it is not monitored yet).
        </span>
      ) : (
        "."
      )}
    </p>
    <ul className={disclosureList()}>
      <li>Describe what you found and the steps to reproduce it.</li>
      <li>Please hold off sharing details publicly until we have had a chance to respond.</li>
      <li>Please do not access, change or delete data that belongs to other people.</li>
      <li>Please do not run tests that could degrade the service for others.</li>
      <li>We do not run a paid bug bounty programme.</li>
    </ul>
  </section>
);
