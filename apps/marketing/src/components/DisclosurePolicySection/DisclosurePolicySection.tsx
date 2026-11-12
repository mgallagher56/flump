import type { FC } from "react";
import {
  disclosureBody,
  disclosureCard,
  disclosureLink,
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
      If you think you have found a vulnerability in Flump, please tell us using the security
      contact below, and give us a reasonable chance to look into it before you share it more
      widely.
    </p>
    <ul className={disclosureList()}>
      <li>Describe what you found and the steps to reproduce it.</li>
      <li>Please do not access, change or delete data that belongs to other people.</li>
      <li>Please do not run tests that could degrade the service for others.</li>
      <li>We do not run a paid bug bounty programme.</li>
    </ul>
    <p className={disclosureBody()}>
      Our contact details are also published in machine-readable form in our{" "}
      <a className={disclosureLink()} href="/.well-known/security.txt">
        security.txt
      </a>{" "}
      file.
    </p>
  </section>
);
