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
      .{" "}
      {BUSINESS_DETAILS.securityContact.isPlaceholder && (
        <span className={disclosurePlaceholder()}>Not monitored yet. </span>
      )}
      We do not run a paid bug bounty.
    </p>
    <ul className={disclosureList()}>
      <li>Describe what you found and how to reproduce it.</li>
      <li>Give us time to respond before sharing it.</li>
      <li>Do not access other people's data or degrade the service.</li>
    </ul>
  </section>
);
