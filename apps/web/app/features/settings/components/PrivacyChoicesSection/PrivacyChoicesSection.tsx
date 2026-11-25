import { LEGAL_PAGES } from "@flump/business-details";
import { Card, PageSection, StoragePreference } from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import { FileText } from "lucide-react";
import type { FC } from "react";
import { sectionCard } from "~/features/settings/settings.styles";
import { legalHref, useMarketingOrigin } from "~/utils/legalLinks";
import { choicesCard, legalLink, legalList } from "./PrivacyChoicesSection.styles";

/**
 * Privacy and browser storage (E19): the switch that turns off the app's optional browser storage
 * (the cookie statement's way to object), and links to the four legal pages on the marketing site
 * at every width, since the one-line footer has room for two of them from 1024px only.
 */
export const PrivacyChoicesSection: FC = () => {
  const marketingOrigin = useMarketingOrigin();
  return (
    <PageSection
      description="What Flump keeps in this browser, and the pages that explain how your data is used."
      headingId="privacy-choices-heading"
      icon={FileText}
      id="settings-privacy-choices"
      title="Privacy and browser storage"
      tone="neutral"
    >
      <Card className={cx(sectionCard(), choicesCard())}>
        <StoragePreference id="app-storage-preference" />
        <ul aria-label="Legal pages" className={legalList()}>
          {LEGAL_PAGES.map((page) => (
            <li key={page.key}>
              <a className={legalLink()} href={legalHref(page.key, marketingOrigin)}>
                {page.title}
              </a>
            </li>
          ))}
        </ul>
      </Card>
    </PageSection>
  );
};
