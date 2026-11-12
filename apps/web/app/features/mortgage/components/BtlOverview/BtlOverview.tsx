import { Button, Icon, KpiCard, KpiStrip, Money, Num } from "@repo/ui";
import { ArrowRight, Building2, Info } from "lucide-react";
import type { FC } from "react";
import {
  btlCard,
  btlHeader,
  btlSubtitle,
  btlTitle,
  btlTitleRow,
  noteIcon,
  noteRow,
} from "./BtlOverview.styles";

export interface BtlOverviewProps {
  propertyCount: number;
  /** Zero or less means no rent has been entered. */
  monthlyRent: number;
  grossYield: number | null;
  /** `null` when balance, rate or term is unknown. */
  monthlyPayment: number | null;
  mortgageType: "repayment" | "interest-only";
  onConfigure: () => void;
}

export const BtlOverview: FC<BtlOverviewProps> = ({
  propertyCount,
  monthlyRent,
  grossYield,
  monthlyPayment,
  mortgageType,
  onConfigure,
}) => {
  const hasRent = monthlyRent > 0;
  const netCashflow = hasRent && monthlyPayment !== null ? monthlyRent - monthlyPayment : null;
  const configure = (
    <Button size="sm" variant="ghost" onClick={onConfigure}>
      Add
    </Button>
  );

  return (
    <div className={btlCard()} data-density="compact" data-testid="btl-overview" id="btl-overview">
      <div className={btlHeader()}>
        <div className={btlTitleRow()}>
          <Icon icon={Building2} size="lg" />
          <div>
            <h3 className={btlTitle()} id="btl-overview-title">
              Buy to let portfolio overview
            </h3>
            <p className={btlSubtitle()}>
              Managing {propertyCount} {propertyCount === 1 ? "property" : "properties"}
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={onConfigure}>
          Configure in profile
          <Icon icon={ArrowRight} size="sm" />
        </Button>
      </div>

      <KpiStrip columns={4}>
        <KpiCard
          emptyAction={configure}
          label="Gross monthly rent"
          value={hasRent ? <Money size="kpi" value={monthlyRent} /> : null}
        />
        <KpiCard
          label="Gross rental yield"
          value={
            grossYield === null ? null : (
              <Num fractionDigits={2} kind="percent" size="kpi" value={grossYield} />
            )
          }
        />
        <KpiCard
          label="Mortgage payment"
          subtext={mortgageType === "interest-only" ? "Interest-only" : "Repayment"}
          value={
            monthlyPayment === null ? null : (
              <Money fractionDigits={2} size="kpi" value={monthlyPayment} />
            )
          }
        />
        <KpiCard
          label="Estimated net cash flow"
          value={
            netCashflow === null ? null : (
              <Money
                fractionDigits={2}
                signDisplay="always"
                size="kpi"
                tone={netCashflow >= 0 ? "positive" : "danger"}
                value={netCashflow}
              />
            )
          }
        />
      </KpiStrip>

      <div className={noteRow()}>
        <Icon className={noteIcon()} icon={Info} size="sm" />
        <span>
          <strong>Section 24 rule:</strong> Buy to let finance costs receive a 20% tax credit rather
          than being deductible expenses from gross rental receipts.
        </span>
      </div>
    </div>
  );
};
