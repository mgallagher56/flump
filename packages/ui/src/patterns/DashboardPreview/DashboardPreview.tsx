import {
  buildFinancialPicture,
  SAMPLE_HOUSEHOLDS,
  type SampleHouseholdKey,
} from "@flump/finance-engine";
import { CalendarCheck, CreditCard, House } from "lucide-react";
import type { FC, ReactElement, ReactNode } from "react";
import { IconTile, type IconTileDomain } from "../../primitives/IconTile/IconTile";
import { KpiCard } from "../../primitives/KpiCard/KpiCard";
import { formatMoney } from "../../primitives/Money/Money";
import {
  BREATHING_ROOM_LABEL,
  breathingRoomPhrase,
} from "../BreathingRoomPreview/BreathingRoomPreview.wording";
import { HeroFigure } from "../HeroFigure/HeroFigure";
import { KpiStrip, type KpiStripItems } from "../KpiStrip/KpiStrip";
import {
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
  line: ReactNode;
  domain: IconTileDomain;
  icon: typeof CalendarCheck;
}

const countFormat = new Intl.NumberFormat("en-GB");
const percentFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });

/**
 * A sample household's dashboard: the net worth hero, a `KpiStrip`, then section cards. Every
 * figure comes from the engine's picture of the `SAMPLE_HOUSEHOLDS` fixture, each figure appears
 * once, and a card whose figure the picture does not know is left out (no invented fallback).
 */
export const DashboardPreview: FC<DashboardPreviewProps> = ({
  id = "dashboard-preview",
  household = "renter",
  className,
}) => {
  const fixture = SAMPLE_HOUSEHOLDS[household].fixture;
  const picture = buildFinancialPicture(fixture);
  const { netWorth, homeEstimate, pensions } = picture.netWorth;
  const { consumerDebt, studentLoans, mortgage } = picture.debt;
  const budget = picture.budget.status === "known" ? picture.budget.value : null;
  const cover = picture.monthsOfCover.status === "known" ? picture.monthsOfCover.value : null;
  const ltv = picture.loanToValue.status === "known" ? picture.loanToValue.value : null;
  const gbp = (value: number) => formatMoney(value, { fractionDigits: 0 }).text;

  // The strip: what is left over, then what is owed outside the mortgage, then pensions. The
  // mortgage has its own section card, so it is not repeated here.
  const owedOutsideMortgage = consumerDebt + studentLoans;
  const kpis: ReactElement[] = [];
  if (budget) {
    kpis.push(
      <KpiCard
        key="left-over"
        label="Left over each month"
        subtext="From your budget"
        value={budget.surplus}
        valueFormat={{ fractionDigits: 0 }}
      />,
    );
  }
  if (owedOutsideMortgage > 0) {
    kpis.push(
      <KpiCard
        key="owed"
        label="What you owe"
        subtext={consumerDebt === 0 ? "Student loan" : undefined}
        value={owedOutsideMortgage}
        valueFormat={{ fractionDigits: 0 }}
      />,
    );
  }
  if (pensions > 0) {
    kpis.push(
      <KpiCard
        key="pension"
        label="Pension pots"
        value={pensions}
        valueFormat={{ fractionDigits: 0 }}
      />,
    );
  }

  const sections: SnapshotSectionItem[] = [];
  if (budget) {
    // Mirrors the app's Budget card: spending each month, with breathing room as its one line.
    sections.push({
      id: "budget",
      title: "Budget",
      label: "Spending each month",
      figure: gbp(budget.outgoings),
      line: cover ? (
        <>
          {BREATHING_ROOM_LABEL}: {breathingRoomPhrase(cover.months)}
        </>
      ) : (
        "Bills and living costs in your budget."
      ),
      domain: "pay",
      icon: CalendarCheck,
    });
  }
  sections.push({
    id: "accounts",
    title: "Accounts",
    // A count, not a balance: for some households cash equals net worth, and a figure is shown
    // once.
    label: "Accounts you track",
    figure: countFormat.format(fixture.accounts.length),
    line: "Updated in your monthly check-in",
    domain: "net-worth",
    icon: CreditCard,
  });
  if (mortgage > 0) {
    sections.push({
      id: "mortgage",
      title: "Mortgage",
      label: "Balance",
      figure: gbp(mortgage),
      line: ltv ? `${percentFormat.format(ltv.percent)}% loan to value` : "Repayment mortgage",
      domain: "mortgage",
      icon: House,
    });
  }

  return (
    <div className={`${dashboardPreviewRoot()} ${className ?? ""}`.trim()} data-testid={id} id={id}>
      <HeroFigure
        id={`${id}-net-worth`}
        label={homeEstimate > 0 ? "Net worth, including your home estimate" : "Net worth"}
        value={netWorth}
        valueFormat={{ fractionDigits: 0 }}
      />

      {kpis.length > 0 && (
        <div data-testid={`${id}-kpis`}>
          <KpiStrip items={kpis.slice(0, 4) as unknown as KpiStripItems} />
        </div>
      )}

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
