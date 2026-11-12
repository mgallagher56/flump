import { Button, Icon } from "@repo/ui";
import { AlertTriangle } from "lucide-react";
import type { FC } from "react";
import { alertBanner, alertBody, alertDate, alertText, alertTitle } from "./MortgageAlerts.styles";

export interface RefinanceWarning {
  diffMonths: number;
  /** The renewal date as stored (ISO date). */
  date: string;
}

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
          className={alertBanner({ tone: "danger" })}
          data-testid="mortgage-refinance-warning"
          id="mortgage-refinance-warning"
        >
          <div className={alertBody({ tone: "danger" })}>
            <Icon icon={AlertTriangle} size="lg" />
            <div>
              <h3 className={alertTitle()}>
                {refinanceWarning.diffMonths > 0
                  ? `Your fixed-rate deal ends in ${refinanceWarning.diffMonths} ${refinanceWarning.diffMonths === 1 ? "month" : "months"}`
                  : "Your fixed-rate deal has ended"}
              </h3>
              <p className={alertText()}>
                Renewal date{" "}
                <span className={alertDate()}>{formatRenewalDate(refinanceWarning.date)}</span>.
                Moving to your lender's standard variable rate usually raises monthly payments, so
                it is worth comparing new deals. Check your lender's terms for any early repayment
                charge (ERC).
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
