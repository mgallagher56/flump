import { Button, KpiCard, KpiStrip, Money, Num, PageSection } from "@repo/ui";
import { Building2 } from "lucide-react";
import type { FC } from "react";
import { btlCard, btlSubtitle, stackedHeaderSection } from "./BtlOverview.styles";

export interface BtlOverviewProps {
  /** `null` when the user has not said how many properties they let. */
  propertyCount: number | null;
  /** Zero or less means no rent has been entered. */
  monthlyRent: number;
  grossYield: number | null;
  /** `null` when the payment is unknown. The page's hero shows it, so it is not repeated here. */
  monthlyPayment: number | null;
  /** Opens the profile, where rent, property value and count are saved. */
  onConfigure: () => void;
}

/**
 * Buy to let figures that the mortgage hero does not show (E16 PR 6): rent, rental yield and the
 * rent left after the mortgage payment. Facts and estimates only, with no status colour on the
 * result and no tax rule under the person's own figure.
 */
export const BtlOverview: FC<BtlOverviewProps> = ({
  propertyCount,
  monthlyRent,
  grossYield,
  monthlyPayment,
  onConfigure,
}) => {
  const hasRent = monthlyRent > 0;
  const rentLeft = hasRent && monthlyPayment !== null ? monthlyRent - monthlyPayment : null;
  const edit = (
    <Button size="sm" variant="outline" onClick={onConfigure}>
      Edit
    </Button>
  );

  return (
    <PageSection
      action={edit}
      className={stackedHeaderSection()}
      description="Rent and rental yield for the properties you let."
      domain="mortgage"
      headingId="btl-overview-title"
      icon={Building2}
      id="btl-overview"
      title="Your buy to let properties"
    >
      <div className={btlCard()}>
        <p className={btlSubtitle()}>
          {propertyCount === null
            ? "Number of properties not set"
            : `${propertyCount} ${propertyCount === 1 ? "property" : "properties"}`}
        </p>

        <KpiStrip
          emptyPrompt={{
            title: "Add your monthly rent and property value to see your rental yield",
            action: edit,
            headingLevel: "h3",
          }}
        >
          <KpiCard
            label="Monthly rent before costs"
            value={hasRent ? <Money size="lg" value={monthlyRent} /> : null}
          />
          <KpiCard
            label="Rental yield before costs"
            value={
              grossYield === null ? null : (
                <Num fractionDigits={2} kind="percent" size="lg" value={grossYield} />
              )
            }
          />
          <KpiCard
            label="Rent left after the mortgage payment (estimate)"
            value={
              rentLeft === null ? null : (
                // Whole pounds and no sign, as every other figure on the page (P39).
                <Money size="lg" value={rentLeft} />
              )
            }
          />
        </KpiStrip>
      </div>
    </PageSection>
  );
};
