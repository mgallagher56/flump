import { Button, Icon } from "@repo/ui";
import { AlertTriangle, CalendarClock } from "lucide-react";
import type { FC } from "react";
import { alertBanner, alertBody, alertDate, alertText, alertTitle } from "./MortgageAlerts.styles";

export interface RefinanceWarning {
  /** Whole calendar months until the fixed rate ends, never below 0. */
  diffMonths: number;
  /** The renewal date as stored (ISO date). */
  date: string;
  /** True once the end date has passed. When absent, a diffMonths of 0 or less means ended. */
  ended?: boolean;
}

const refinanceTitle = ({ diffMonths, ended }: RefinanceWarning): string => {
  if (ended ?? diffMonths <= 0) return "Your fixed-rate deal has ended";
  if (diffMonths <= 0) return "Your fixed-rate deal ends in less than a month";
  return `Your fixed-rate deal ends in ${diffMonths} ${diffMonths === 1 ? "month" : "months"}`;
};

export interface MortgageAlertsProps {
  refinanceWarning: RefinanceWarning | null;
  showMissingAccount: boolean;
  onSimulateRateShock: () => void;
  onAddAccount: () => void;
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "long" });

const formatRenewalDate = (raw: string): string => {
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : dateFormat.format(parsed);
};

export const MortgageAlerts: FC<MortgageAlertsProps> = ({
  refinanceWarning,
  showMissingAccount,
  onSimulateRateShock,
  onAddAccount,
}) => {
  if (!refinanceWarning && !showMissingAccount) return null;
  return (
    <>
      {refinanceWarning && (
        <div
          className={alertBanner({ tone: "info" })}
          data-testid="mortgage-refinance-warning"
          id="mortgage-refinance-warning"
        >
          <div className={alertBody({ tone: "info" })}>
            <Icon icon={CalendarClock} size="lg" />
            <div>
              <h3 className={alertTitle()}>{refinanceTitle(refinanceWarning)}</h3>
              <p className={alertText()}>
                Renewal date{" "}
                <span className={alertDate()}>{formatRenewalDate(refinanceWarning.date)}</span>.
                After a fixed rate ends, the rate your lender charges can change. Your lender's
                terms set out any early repayment charge (ERC).
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={onSimulateRateShock}>
            Simulate rate shock
          </Button>
        </div>
      )}
      {showMissingAccount && (
        <div
          className={alertBanner({ tone: "warning" })}
          data-testid="mortgage-account-missing"
          id="mortgage-account-missing"
        >
          <div className={alertBody({ tone: "warning" })}>
            <Icon icon={AlertTriangle} size="lg" />
            <div>
              <h3 className={alertTitle()}>Mortgage account missing</h3>
              <p className={alertText()}>
                Your profile says you have a mortgage, but no mortgage account has been added.
                Connect or add one to track it.
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={onAddAccount}>
            Add account
          </Button>
        </div>
      )}
    </>
  );
};
