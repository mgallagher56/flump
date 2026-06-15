import { css } from "@repo/ui/styled-system/css";
import { type FC, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaChartLine, FaCoins, FaExclamationTriangle, FaHome } from "react-icons/fa";
import { useLoaderData, useNavigate } from "react-router";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import MortgageTracker from "~/components/mortgage/MortgageTracker";
import OverpaymentSimulator from "~/components/mortgage/OverpaymentSimulator";
import OverpayVsSaveCompare from "~/components/mortgage/OverpayVsSaveCompare";
import { useUserProfile } from "~/hooks/useUserProfile";
import type { loader } from "~/routes/app.mortgage";
import { currentMonth, currentYear } from "~/utils/utils";

const MortgageContainer: FC = () => {
  const { t } = useTranslation();
  const { accounts = [], accountDetails = [], userProfile } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { profile, setProfile } = useUserProfile();

  // Sync profile from loader into atom
  useEffect(() => {
    if (userProfile) setProfile(userProfile);
  }, [userProfile, setProfile]);

  const [activeTab, setActiveTab] = useState<"tracker" | "simulator" | "compare">("tracker");

  // Shared mortgage states
  const [loanAmount, setLoanAmount] = useState<number>(150000);
  const [interestRate, setInterestRate] = useState<number>(4.5);
  const [remainingTerm, setRemainingTerm] = useState<number>(25);
  const [overpayment, setOverpayment] = useState<number>(200);

  // Synced account state
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Filter for mortgage accounts
  const mortgageAccounts = useMemo(() => {
    return accounts.filter((acc: any) => acc.type === "Mortgage");
  }, [accounts]);

  // Pre-populate with first linked mortgage account if found
  useEffect(() => {
    if (mortgageAccounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(mortgageAccounts[0].id);
    }
  }, [mortgageAccounts, selectedAccountId]);

  // Handle account selection
  useEffect(() => {
    if (selectedAccountId) {
      const acc = mortgageAccounts.find((a) => a.id === selectedAccountId);
      if (acc) {
        const details = accountDetails.filter((d: any) => d.account_id === acc.id);
        const rawBalance =
          details.length > 0
            ? (details.find((d: any) => d.month === currentMonth && d.year === currentYear)
                ?.value ?? details[details.length - 1].value)
            : acc.balance || 0;

        // Balance is negative in database, take absolute value for calculations
        setLoanAmount(Math.abs(rawBalance));
      }
    }
  }, [selectedAccountId, mortgageAccounts, accountDetails]);

  // Styles
  const containerStyle = css({
    paddingBottom: "48px",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  });

  const tabContainerStyle = css({
    display: "flex",
    gap: "16px",
    borderBottom: "1px solid",
    borderColor: "border",
    paddingBottom: "8px",
    marginTop: "16px",
  });

  const tabBtnStyle = (active: boolean) =>
    css({
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 16px",
      fontSize: "sm",
      fontWeight: "semibold",
      color: active ? "primary" : "text.muted",
      cursor: "pointer",
      borderBottom: "2px solid",
      borderBottomColor: active ? "primary" : "transparent",
      marginBottom: "-10px",
      transition: "all 0.2s",
      "&:hover": {
        color: "primary",
      },
    });

  return (
    <div className={containerStyle}>
      {/* Title */}
      <div className={css({ my: 6 })}>
        <FLPHeading as="h1" color="blue.500" size="xl">
          Mortgage Tools & Calculator
        </FLPHeading>
        <FLPText color="text.muted" fontSize="sm">
          Track your payments, simulate overpayments, and optimize your savings strategy.
        </FLPText>
      </div>

      {profile.hasMortgage && mortgageAccounts.length === 0 && (
        <div
          className={css({
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            backgroundColor: "rgba(245, 158, 11, 0.08)",
            border: "1px solid",
            borderColor: "#f59e0b",
            borderRadius: "lg",
            gap: "16px",
            my: 2,
          })}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <FaExclamationTriangle color="#f59e0b" size={18} />
            <div>
              <FLPHeading as="h4" size="xs" style={{ margin: 0, color: "#f59e0b" }}>
                Mortgage Account Missing
              </FLPHeading>
              <FLPText fontSize="xs" color="text.muted" style={{ margin: 0 }}>
                You indicated that you have a mortgage in your profile, but no mortgage account has
                been added to your accounts. Connect or add one to track it.
              </FLPText>
            </div>
          </div>
          <button
            className={css({
              padding: "6px 12px",
              fontSize: "xs",
              fontWeight: "semibold",
              color: "white",
              backgroundColor: "#f59e0b",
              border: "none",
              borderRadius: "md",
              cursor: "pointer",
              transition: "all 0.2s",
              "&:hover": { opacity: 0.9 },
            })}
            type="button"
            onClick={() => navigate("/app/accounts")}
          >
            Add Account
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className={tabContainerStyle}>
        <button
          className={tabBtnStyle(activeTab === "tracker")}
          type="button"
          onClick={() => setActiveTab("tracker")}
        >
          <FaHome size={14} />
          Mortgage Tracker
        </button>
        <button
          className={tabBtnStyle(activeTab === "simulator")}
          type="button"
          onClick={() => setActiveTab("simulator")}
        >
          <FaChartLine size={14} />
          Overpayment Simulator
        </button>
        <button
          className={tabBtnStyle(activeTab === "compare")}
          type="button"
          onClick={() => setActiveTab("compare")}
        >
          <FaCoins size={14} />
          Overpay vs. Save
        </button>
      </div>

      {/* Selected Tab content */}
      {activeTab === "tracker" && (
        <MortgageTracker
          interestRate={interestRate}
          loanAmount={loanAmount}
          mortgageAccounts={mortgageAccounts}
          remainingTerm={remainingTerm}
          selectedAccountId={selectedAccountId}
          onInterestRateChange={setInterestRate}
          onLoanAmountChange={setLoanAmount}
          onRemainingTermChange={setRemainingTerm}
          onSelectAccount={(id) => {
            setSelectedAccountId(id);
            if (!id) {
              // Reset to standard manual default if unlinked
              setLoanAmount(150000);
            }
          }}
        />
      )}

      {activeTab === "simulator" && (
        <OverpaymentSimulator
          interestRate={interestRate}
          loanAmount={loanAmount}
          overpayment={overpayment}
          remainingTerm={remainingTerm}
          onOverpaymentChange={setOverpayment}
        />
      )}

      {activeTab === "compare" && (
        <OverpayVsSaveCompare
          interestRate={interestRate}
          loanAmount={loanAmount}
          overpayment={overpayment}
          remainingTerm={remainingTerm}
        />
      )}
    </div>
  );
};

export default MortgageContainer;
