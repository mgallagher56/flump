import { Button, PageSection } from "@repo/ui";
import { Building2 } from "lucide-react";
import type { FC } from "react";
import {
  btlCard,
  btlList,
  btlListItem,
  btlPrompt,
  btlPropertyName,
  btlSubtitle,
  btlYieldLine,
  stackedHeaderSection,
} from "./BtlOverview.styles";

export interface BtlOverviewProperty {
  id: string;
  name: string;
  /**
   * Gross yield in per cent for the current tax year, from the rent linked to this property in
   * Self Assessment (`grossRentalYieldPct`). null or absent when no rent is linked.
   */
  yieldPct?: number | null;
}

const yieldFormat = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export interface BtlOverviewProps {
  /** The rental Property accounts saved on Accounts (system audit slice 4). */
  properties: readonly BtlOverviewProperty[];
  /** Opens Accounts, where each rental property is kept. */
  onManage: () => void;
}

/**
 * The properties the user lets, read from their rental Property accounts (HM-4, DB-1), each with
 * its gross yield. Rent is entered once, in Self Assessment, linked to the property (HM-5, L22).
 */
export const BtlOverview: FC<BtlOverviewProps> = ({ properties, onManage }) => {
  const count = properties.length;
  const hasYield = (property: BtlOverviewProperty) =>
    property.yieldPct !== null && property.yieldPct !== undefined;
  const anyWithoutRent = properties.some((property) => !hasYield(property));
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
                <span className={btlPropertyName()}>{property.name}</span>
                {hasYield(property) ? (
                  <span className={btlYieldLine()}>
                    {`Gross yield ${yieldFormat.format(property.yieldPct ?? 0)}%`}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        {anyWithoutRent ? (
          <p className={btlPrompt()}>
            Add rent in Self Assessment, linked to a property, to see that property's yield.
          </p>
        ) : null}
      </div>
    </PageSection>
  );
};
