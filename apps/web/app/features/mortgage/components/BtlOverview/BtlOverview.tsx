import { Button, PageSection } from "@repo/ui";
import { Building2 } from "lucide-react";
import type { FC } from "react";
import {
  btlCard,
  btlList,
  btlListItem,
  btlSubtitle,
  stackedHeaderSection,
} from "./BtlOverview.styles";

export interface BtlOverviewProperty {
  id: string;
  name: string;
}

export interface BtlOverviewProps {
  /** The rental Property accounts saved on Accounts (system audit slice 4). */
  properties: readonly BtlOverviewProperty[];
  /** Opens Accounts, where each rental property is kept. */
  onManage: () => void;
}

/**
 * The properties the user lets, read from their rental Property accounts (HM-4, DB-1). Rent and
 * rental yield are not shown: no rent is saved anywhere this page reads (HM-5).
 */
export const BtlOverview: FC<BtlOverviewProps> = ({ properties, onManage }) => {
  const count = properties.length;
  return (
    <PageSection
      action={
        <Button size="sm" variant="outline" onClick={onManage}>
          Edit on Accounts
        </Button>
      }
      className={stackedHeaderSection()}
      description="The properties you let, as saved on Accounts."
      domain="mortgage"
      headingId="btl-overview-title"
      icon={Building2}
      id="btl-overview"
      title="Your buy to let properties"
    >
      <div className={btlCard()}>
        <p className={btlSubtitle()}>
          {count === 0
            ? "No rental property saved on Accounts yet"
            : `${count} ${count === 1 ? "property" : "properties"}`}
        </p>
        {count > 0 ? (
          <ul aria-label="Rental properties" className={btlList()}>
            {properties.map((property) => (
              <li className={btlListItem()} key={property.id}>
                {property.name}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </PageSection>
  );
};
