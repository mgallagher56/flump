import type { TaxCalculationResult, TaxRecord, TaxSource } from "@flump/finance-engine";
import { Button, Icon } from "@repo/ui";
import { Briefcase, Home, Laptop, PiggyBank } from "lucide-react";
import type { FC, MouseEvent } from "react";
import { NotSet } from "~/features/feedback/components/NotSet";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import TaxIncomeSectionCard, { type TaxIncomeSectionCardProps } from "../TaxIncomeSectionCard";
import { intro, note, root } from "./TaxSourcesPanel.styles";

type SectionHandlers = Pick<
  TaxIncomeSectionCardProps,
  "onOpenAddModal" | "onOpenEditModal" | "onOpenCopyModal" | "onQuickAdd" | "onViewReceipt"
>;

export interface TaxSourcesPanelProps extends SectionHandlers {
  records: TaxRecord[];
  taxYear: string;
  previousTaxYear: string;
  result: TaxCalculationResult;
  /** Salary from the profile or baseline, 0 when unknown. */
  profileSalary: number;
  ownershipSharePct: number;
  onDeleteRecord: (id: string) => void;
}

/** "Income and costs" tab: one card per income source, each with a short context note. */
export const TaxSourcesPanel: FC<TaxSourcesPanelProps> = ({
  records,
  taxYear,
  previousTaxYear,
  result,
  profileSalary,
  ownershipSharePct,
  onDeleteRecord,
  ...handlers
}) => {
  const { formatCurrencyDecimal: money } = useFormatCurrency();
  const onDelete = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    onDeleteRecord(id);
  };
  const common = {
    records,
    selectedTaxYear: taxYear,
    previousTaxYear,
    onDeleteRecord: onDelete,
    ...handlers,
  };
  const addPayslip = () => handlers.onOpenAddModal("paye" as TaxSource, "income");

  return (
    <div className={root()}>
      <p className={intro()}>
        Open a source to see its records for {taxYear}, attach receipts or add an item.
      </p>

      <TaxIncomeSectionCard
        {...common}
        source="paye"
        title="Employment (PAYE)"
        subtitle="Salary, bonuses, benefits in kind and pension contributions"
        icon={<Icon icon={Briefcase} size="sm" />}
        colorScheme="blue"
        isOpenDefault
        contextBanner={
          <div className={note({ tone: "info" })}>
            <span>
              Salary in your profile:{" "}
              <strong>
                {profileSalary > 0 ? (
                  `${money(profileSalary)} a year`
                ) : (
                  <NotSet href="/app/profile" subject="salary" />
                )}
              </strong>
              .{" "}
              {result.payeIncomeGross > 0
                ? `The estimate uses ${money(result.effectivePayeSalary)} from the payslips you logged.`
                : "No payslips logged for this year, so the estimate uses your profile salary."}
            </span>
            <Button size="sm" type="button" variant="outline" onClick={addPayslip}>
              Log a payslip or bonus
            </Button>
          </div>
        }
      />

      <TaxIncomeSectionCard
        {...common}
        source="rental"
        title="Rental property"
        isOpenDefault={false}
        subtitle="Rent, maintenance, service charges and mortgage interest"
        icon={<Icon icon={Home} size="sm" />}
        colorScheme="amber"
        contextBanner={
          <div className={note()}>
            <span>
              Your ownership share: <strong>{ownershipSharePct}%</strong>. Section 24 finance cost
              credit: <strong>-{money(result.rentalPropertyTaxCredit)}</strong> (20% basic rate
              relief).
            </span>
          </div>
        }
      />

      <TaxIncomeSectionCard
        {...common}
        source="self-employed"
        title="Self-employed and freelance"
        isOpenDefault={false}
        subtitle="Sole trader turnover, client retainers and allowable costs"
        icon={<Icon icon={Laptop} size="sm" />}
        colorScheme="emerald"
        contextBanner={
          <div className={note()}>
            <span>
              Allowable costs logged: <strong>{money(result.seExpenses)}</strong>. The £1,000
              trading allowance can be used instead of actual costs when it is higher.
            </span>
          </div>
        }
      />

      <TaxIncomeSectionCard
        {...common}
        source="savings"
        title="Savings and dividends"
        isOpenDefault={false}
        subtitle="Savings interest, ISA returns and share dividends"
        icon={<Icon icon={PiggyBank} size="sm" />}
        colorScheme="purple"
        contextBanner={
          <div className={note()}>
            <span>
              Personal Savings Allowance: <strong>{money(result.personalSavingsAllowance)}</strong>.
              Dividend Allowance: <strong>{money(result.dividendAllowance)}</strong>. ISA interest
              is tax-free.
            </span>
          </div>
        }
      />
    </div>
  );
};

export default TaxSourcesPanel;
