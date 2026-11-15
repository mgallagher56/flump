import {
  buildFinancialPicture,
  SAMPLE_HOUSEHOLDS,
  type SampleHouseholdKey,
} from "@flump/finance-engine";
import { CalendarCheck, CreditCard, House, PiggyBank } from "lucide-react";
import type { FC } from "react";
import { IconTile, type IconTileDomain } from "../../primitives/IconTile/IconTile";
import { KpiCard } from "../../primitives/KpiCard/KpiCard";
import { HeroFigure } from "../HeroFigure/HeroFigure";
import {
  dashboardKpiRow,
  dashboardPreviewRoot,
  dashboardSectionGrid,
  sectionCard,
  sectionCardFigure,
  sectionCardHeader,
  sectionCardLabel,
  sectionCardLine,
  sectionCardTitle,
} from "./DashboardPreview.styles";

export interface DashboardPreviewProps {
  id?: string;
  household?: SampleHouseholdKey;
  className?: string;
}

interface SnapshotSectionItem {
  id: string;
  title: string;
  label: string;
  figure: string;
  line: string;
  domain: IconTileDomain;
  icon: typeof CalendarCheck;
}

export const DashboardPreview: FC<DashboardPreviewProps> = ({
  id = "dashboard-preview",
  household = "renter",
  className,
}) => {
  const isOwner = household === "homeowner";
  const fixture = SAMPLE_HOUSEHOLDS[household].fixture;
  const picture = buildFinancialPicture(fixture);

  const netWorth = picture.netWorth.netWorth;
  const leftOver =
    picture.budget.status === "known" ? picture.budget.value.surplus : isOwner ? 919 : 752;

  const sections: SnapshotSectionItem[] = isOwner
    ? [
        {
          id: "budget",
          title: "Budget",
          label: "Left over each month",
          figure: "£919",
          line: "From your budget",
          domain: "savings",
          icon: CalendarCheck,
        },
        {
          id: "accounts",
          title: "Accounts",
          label: "Cash savings",
          figure: "£21,000",
          line: "From your accounts",
          domain: "net-worth",
          icon: CreditCard,
        },
        {
          id: "mortgage",
          title: "Mortgage",
          label: "Balance",
          figure: "£186,000",
          line: "60% loan to value",
          domain: "mortgage",
          icon: House,
        },
        {
          id: "pension",
          title: "Pension",
          label: "Total in pots",
          figure: "£96,000",
          line: "Workplace and personal",
          domain: "pension",
          icon: PiggyBank,
        },
      ]
    : [
        {
          id: "budget",
          title: "Budget",
          label: "Left over each month",
          figure: "£752",
          line: "From your budget",
          domain: "savings",
          icon: CalendarCheck,
        },
        {
          id: "accounts",
          title: "Accounts",
          label: "Cash savings",
          figure: "£6,050",
          line: "From your accounts",
          domain: "net-worth",
          icon: CreditCard,
        },
        {
          id: "housing",
          title: "Housing",
          label: "Rent",
          figure: "£850 a month",
          line: "Essential spending",
          domain: "mortgage",
          icon: House,
        },
        {
          id: "savings",
          title: "Savings",
          label: "Cash ISA",
          figure: "£4,200",
          line: "4.1% interest rate",
          domain: "savings",
          icon: PiggyBank,
        },
      ];

  return (
    <div className={`${dashboardPreviewRoot()} ${className ?? ""}`.trim()} data-testid={id} id={id}>
      <HeroFigure
        id={`${id}-net-worth`}
        label={isOwner ? "Net worth, including your home estimate" : "Net worth"}
        value={netWorth}
        valueFormat={{ fractionDigits: 0 }}
      />

      <div className={dashboardKpiRow()} data-testid={`${id}-kpis`}>
        <KpiCard
          key="left-over"
          label="Left over each month"
          subtext="From your budget"
          value={leftOver}
          valueFormat={{ fractionDigits: 0 }}
        />
        {isOwner ? (
          <KpiCard
            key="pension"
            label="Pension pots"
            subtext="Workplace and personal"
            value={96000}
            valueFormat={{ fractionDigits: 0 }}
          />
        ) : (
          <KpiCard
            key="debt"
            label="What you owe"
            subtext="Student loan"
            value={41500}
            valueFormat={{ fractionDigits: 0 }}
          />
        )}
      </div>

      <div className={dashboardSectionGrid()} data-testid={`${id}-sections`}>
        {sections.map((sec) => (
          <div
            className={sectionCard()}
            data-section-card={sec.id}
            data-testid={`${id}-section-${sec.id}`}
            key={sec.id}
          >
            <div className={sectionCardHeader()}>
              <IconTile domain={sec.domain} icon={sec.icon} />
              <h3 className={sectionCardTitle()} id={`${id}-title-${sec.id}`}>
                {sec.title}
              </h3>
            </div>
            <p className={sectionCardLabel()}>{sec.label}</p>
            <p className={sectionCardFigure()}>{sec.figure}</p>
            <p className={sectionCardLine()}>{sec.line}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardPreview;
