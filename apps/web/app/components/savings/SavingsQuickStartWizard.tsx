import { css } from "@repo/ui/styled-system/css";
import { type FC, useState } from "react";
import { FaArrowLeft, FaArrowRight, FaCheckCircle, FaCoins, FaRocket } from "react-icons/fa";
import { useFetcher } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPCard from "~/components/core/cards/FLPCard";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";

interface SavingsQuickStartWizardProps {
  onComplete: () => void;
  onDismiss?: () => void;
}

const wizardContainerStyle = css({
  padding: "32px",
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "primary",
  backgroundColor: "rgba(99, 99, 241, 0.03)",
  boxShadow: "sm",
  display: "flex",
  flexDirection: "column",
  gap: "24px",
});

const stepIndicatorStyle = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  position: "relative",
  marginBottom: "8px",
});

const inputStyle = css({
  width: "100%",
  padding: "10px 14px",
  fontSize: "sm",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "border",
  backgroundColor: "surface",
  color: "text.primary",
  outline: "none",
  transition: "all 0.2s",
  _focus: {
    borderColor: "primary",
    boxShadow: "0 0 0 1px token(colors.primary)",
  },
});

export const SavingsQuickStartWizard: FC<SavingsQuickStartWizardProps> = ({
  onComplete,
  onDismiss,
}) => {
  const fetcher = useFetcher();
  const { formatCurrency } = useFormatCurrency();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form states
  const [accountName, setAccountName] = useState("High Yield Savings");
  const [accountType, setAccountType] = useState<"Saving" | "Investment">("Saving");
  const [startingBalance, setStartingBalance] = useState("2000");
  const [interestRate, setInterestRate] = useState("4.5");
  const [monthlyContribution, setMonthlyContribution] = useState("250");

  const numericBalance = Number(startingBalance) || 0;
  const numericRate = Number(interestRate) || 0;
  const numericMonthly = Number(monthlyContribution) || 0;

  // Simple projection for step 3
  const projectedFiveYear = Math.round(
    numericBalance * (1 + numericRate / 100 / 12) ** 60 +
      numericMonthly *
        (((1 + numericRate / 100 / 12) ** 60 - 1) / (numericRate / 100 / 12 || 1 / 12)),
  );

  const projectedTenYear = Math.round(
    numericBalance * (1 + numericRate / 100 / 12) ** 120 +
      numericMonthly *
        (((1 + numericRate / 100 / 12) ** 120 - 1) / (numericRate / 100 / 12 || 1 / 12)),
  );

  const handleFinish = () => {
    fetcher.submit(
      {
        intent: "createSavingsAccount",
        name: accountName.trim() || "My Savings Account",
        type: accountType,
        balance: String(numericBalance),
        interestRate: String(numericRate),
        monthlyContribution: String(numericMonthly),
      },
      { method: "POST", action: "/app/savings" },
    );
    onComplete();
  };

  return (
    <FLPCard className={wizardContainerStyle}>
      {/* Header and Step Dots */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FaRocket style={{ color: "var(--colors-primary)" }} />
            <FLPHeading as="h4" size="sm">
              Quick Setup: Savings & Forecasting
            </FLPHeading>
          </div>
          {onDismiss && (
            <button
              type="button"
              style={{
                background: "none",
                border: "none",
                color: "var(--colors-text-muted)",
                fontSize: "12px",
                cursor: "pointer",
              }}
              onClick={onDismiss}
            >
              Skip setup
            </button>
          )}
        </div>
        <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "4px" }}>
          Step {step} of 3:{" "}
          {step === 1
            ? "Add Your First Account"
            : step === 2
              ? "Set Monthly Savings Goal"
              : "Review & Launch"}
        </FLPText>
      </div>

      {/* Step Content */}
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label htmlFor="wizard-acc-name">
              <FLPText fontSize="sm" fontWeight="medium">
                Account Name
              </FLPText>
            </label>
            <input
              id="wizard-acc-name"
              className={inputStyle}
              placeholder="e.g. Barclays Rainy Day, Marcus Saver"
              style={{ marginTop: "4px" }}
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label htmlFor="wizard-start-bal">
                <FLPText fontSize="sm" fontWeight="medium">
                  Current Balance (£)
                </FLPText>
              </label>
              <input
                id="wizard-start-bal"
                className={inputStyle}
                min="0"
                placeholder="2000"
                style={{ marginTop: "4px" }}
                type="number"
                value={startingBalance}
                onChange={(e) => setStartingBalance(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="wizard-int-rate">
                <FLPText fontSize="sm" fontWeight="medium">
                  Interest rate / AER (%)
                </FLPText>
              </label>
              <input
                id="wizard-int-rate"
                className={inputStyle}
                max="100"
                min="0"
                placeholder="4.5"
                step="0.1"
                style={{ marginTop: "4px" }}
                type="number"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label htmlFor="wizard-monthly-contrib">
              <FLPText fontSize="sm" fontWeight="medium">
                How much do you plan to deposit each month? (£/month)
              </FLPText>
            </label>
            <FLPText color="text.muted" fontSize="xs" style={{ marginBottom: "6px" }}>
              Even a small regular amount compounds significantly over time.
            </FLPText>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", maxWidth: "250px" }}>
              <span style={{ fontSize: "16px", color: "var(--colors-text-muted)" }}>£</span>
              <input
                id="wizard-monthly-contrib"
                className={inputStyle}
                min="0"
                step="25"
                type="number"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(e.target.value)}
              />
              <span style={{ fontSize: "14px", color: "var(--colors-text-muted)" }}>/month</span>
            </div>
          </div>

          <div
            style={{
              padding: "16px",
              borderRadius: "lg",
              backgroundColor: "rgba(16, 185, 129, 0.06)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FaCoins style={{ color: "#10b981" }} />
              <FLPText fontSize="sm" fontWeight="semibold" style={{ color: "#10b981" }}>
                Annual Deposits: {formatCurrency(numericMonthly * 12)} / year
              </FLPText>
            </div>
            <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "4px" }}>
              At {numericRate}% interest, your deposits will earn ~
              {formatCurrency(Math.round(numericBalance * (numericRate / 100)))} in interest in year
              1.
            </FLPText>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              padding: "16px",
              borderRadius: "lg",
              backgroundColor: "var(--colors-surface)",
              border: "1px solid var(--colors-border)",
            }}
          >
            <div>
              <FLPText color="text.muted" fontSize="xs">
                5-Year Projection
              </FLPText>
              <FLPHeading
                as="h4"
                size="md"
                style={{ color: "var(--colors-primary)", marginTop: "4px" }}
              >
                {formatCurrency(projectedFiveYear)}
              </FLPHeading>
              <FLPText color="text.muted" fontSize="xs">
                Deposits: {formatCurrency(numericBalance + numericMonthly * 60)}
              </FLPText>
            </div>
            <div>
              <FLPText color="text.muted" fontSize="xs">
                10-Year Projection
              </FLPText>
              <FLPHeading as="h4" size="md" style={{ color: "#10b981", marginTop: "4px" }}>
                {formatCurrency(projectedTenYear)}
              </FLPHeading>
              <FLPText color="text.muted" fontSize="xs">
                Interest: ~
                {formatCurrency(
                  Math.max(0, projectedTenYear - (numericBalance + numericMonthly * 120)),
                )}
              </FLPText>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FaCheckCircle style={{ color: "#10b981" }} />
            <FLPText fontSize="xs">
              Account <strong>{accountName}</strong> with {formatCurrency(numericBalance)} balance
              and +{formatCurrency(numericMonthly)}/mo is ready to save!
            </FLPText>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: "8px",
        }}
      >
        {step > 1 ? (
          <FLPButton size="sm" variant="ghost" onClick={() => setStep((s) => (s - 1) as 1 | 2)}>
            <FaArrowLeft style={{ marginRight: "6px" }} /> Back
          </FLPButton>
        ) : (
          <div />
        )}

        {step < 3 ? (
          <FLPButton size="sm" variant="primary" onClick={() => setStep((s) => (s + 1) as 2 | 3)}>
            Next <FaArrowRight style={{ marginLeft: "6px" }} />
          </FLPButton>
        ) : (
          <FLPButton size="sm" variant="primary" onClick={handleFinish}>
            Complete & Save <FaCheckCircle style={{ marginLeft: "6px" }} />
          </FLPButton>
        )}
      </div>
    </FLPCard>
  );
};

export default SavingsQuickStartWizard;
