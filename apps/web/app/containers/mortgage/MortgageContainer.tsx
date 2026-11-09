import { calculateLtvMilestones } from "@flump/finance-engine";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FaArrowRight,
  FaBuilding,
  FaChartLine,
  FaCoins,
  FaExclamationTriangle,
  FaHome,
  FaInfoCircle,
} from "react-icons/fa";
import { useLoaderData, useNavigate } from "react-router";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import MortgageTracker from "~/components/mortgage/MortgageTracker";
import OverpaymentSimulator from "~/components/mortgage/OverpaymentSimulator";
import OverpayVsSaveCompare from "~/components/mortgage/OverpayVsSaveCompare";
import RemortgageShockSim from "~/components/mortgage/RemortgageShockSim";
import { GlobalBaselineScenarioBar } from "~/components/navigation/GlobalBaselineScenarioBar";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { useUserProfile } from "~/hooks/useUserProfile";
import type { loader } from "~/routes/app.mortgage";
import { useFinancialBaseline } from "~/state/baseline.store";
import { currentMonth, currentYear } from "~/utils/utils";

const MortgageContainer: FC = () => {
  const { t } = useTranslation();
  const { accounts = [], accountDetails = [], userProfile } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { profile, setProfile } = useUserProfile();
  const { formatCurrency } = useFormatCurrency();
  const { baseline } = useFinancialBaseline();

  // Sync profile from loader into atom
  useEffect(() => {
    if (userProfile) setProfile(userProfile);
  }, [userProfile, setProfile]);

  const [activeTab, setActiveTab] = useState<"tracker" | "simulator" | "compare">("tracker");
  const [propertyCategory, setPropertyCategory] = useState<"residential" | "btl">("residential");
  const [mortgageType, setMortgageType] = useState<"repayment" | "interest-only">(
    userProfile?.mortgageType || "repayment",
  );

  // Shared mortgage states
  const [loanAmount, setLoanAmount] = useState<number>(150000);
  const [interestRate, setInterestRate] = useState<number>(4.5);
  const [remainingTerm, setRemainingTerm] = useState<number>(25);
  const [overpayment, setOverpayment] = useState<number>(200);

  const propertyValue =
    propertyCategory === "btl"
      ? profile.buyToLetPropertyValue || 250000
      : profile.homeValue || Math.round(loanAmount / 0.75);

  const currentLtv = propertyValue > 0 ? (loanAmount / propertyValue) * 100 : 75;

  const ltvMilestones = useMemo(() => {
    return calculateLtvMilestones(propertyValue, loanAmount, profile.mortgageRenewalDate);
  }, [propertyValue, loanAmount, profile.mortgageRenewalDate]);

  const refinanceWarning = useMemo(() => {
    if (!profile.mortgageRenewalDate) return null;
    const expiry = new Date(profile.mortgageRenewalDate).getTime();
    if (Number.isNaN(expiry)) return null;
    const now = new Date().getTime();
    const diffMonths = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24 * 30.4375));
    if (diffMonths <= 6) {
      return {
        diffMonths,
        date: profile.mortgageRenewalDate,
      };
    }
    return null;
  }, [profile.mortgageRenewalDate]);

  // Synced account state
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Filter for mortgage accounts
  const mortgageAccounts = useMemo(() => {
    return accounts.filter((acc: any) => acc.type === "Mortgage");
  }, [accounts]);

  // Pre-populate with first linked mortgage account if found
  useEffect(() => {
    if (mortgageAccounts.length > 0 && !selectedAccountId && propertyCategory === "residential") {
      setSelectedAccountId(mortgageAccounts[0].id);
    }
  }, [mortgageAccounts, selectedAccountId, propertyCategory]);

  // Handle account selection
  useEffect(() => {
    if (selectedAccountId && propertyCategory === "residential") {
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
  }, [selectedAccountId, mortgageAccounts, accountDetails, propertyCategory]);

  const switchToCategory = (cat: "residential" | "btl") => {
    setPropertyCategory(cat);
    if (cat === "btl") {
      setLoanAmount(profile.buyToLetMortgageBalance ?? 180000);
      setInterestRate(profile.buyToLetMortgageRate ?? 5.2);
      setMortgageType(profile.buyToLetMortgageType ?? "interest-only");
      setSelectedAccountId(null);
    } else {
      setMortgageType(profile.mortgageType ?? "repayment");
      if (mortgageAccounts.length > 0) {
        setSelectedAccountId(mortgageAccounts[0].id);
      } else {
        setLoanAmount(150000);
        setInterestRate(4.5);
      }
    }
  };

  // Live BTL monthly payment calculation
  const btlMonthlyPayment = useMemo(() => {
    if (loanAmount <= 0 || interestRate <= 0) return 0;
    const i = interestRate / 100 / 12;
    if (mortgageType === "interest-only") {
      return loanAmount * i;
    }
    const n = remainingTerm * 12;
    return (loanAmount * i * (1 + i) ** n) / ((1 + i) ** n - 1);
  }, [loanAmount, interestRate, remainingTerm, mortgageType]);

  const btlMonthlyRent = profile.buyToLetMonthlyRental || 0;
  const btlPropertyValue = profile.buyToLetPropertyValue || 0;
  const btlGrossYield =
    btlPropertyValue > 0 && btlMonthlyRent > 0
      ? ((btlMonthlyRent * 12) / btlPropertyValue) * 100
      : null;
  const btlNetCashflow = btlMonthlyRent - btlMonthlyPayment;

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
      <GlobalBaselineScenarioBar />

      {/* Refinance Warning Banner */}
      {refinanceWarning && (
        <div
          className={css({
            padding: "16px 20px",
            borderRadius: "lg",
            backgroundColor: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.35)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          })}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FaExclamationTriangle color="#dc2626" size={20} />
            <div>
              <FLPHeading as="h4" size="sm" style={{ color: "#dc2626", margin: 0 }}>
                Mortgage refinance cliff warning (expires in {refinanceWarning.diffMonths} months)
              </FLPHeading>
              <FLPText fontSize="xs" color="text.muted" style={{ margin: "2px 0 0 0" }}>
                Your fixed-rate deal expires on <strong>{refinanceWarning.date}</strong>. Moving to
                your lender's Standard Variable Rate (~7.5–8.0%) will sharply increase monthly
                payments. Compare new fixed deals now.
              </FLPText>
            </div>
          </div>
          <button
            type="button"
            className={css({
              padding: "8px 14px",
              fontSize: "xs",
              fontWeight: "bold",
              color: "white",
              backgroundColor: "#dc2626",
              border: "none",
              borderRadius: "md",
              cursor: "pointer",
              "&:hover": { opacity: 0.9 },
            })}
            onClick={() => setActiveTab("simulator")}
          >
            Simulate rate shock →
          </button>
        </div>
      )}

      {/* Title */}
      <div className={css({ my: 4 })}>
        <FLPHeading as="h1" color="blue.500" size="xl">
          Mortgage tools and calculator
        </FLPHeading>
        <FLPText color="text.muted" fontSize="sm">
          Track your payments, simulate overpayments and optimise your savings strategy.
        </FLPText>
      </div>

      {/* Property Category Switcher */}
      <div
        className={css({
          display: "flex",
          gap: "8px",
          backgroundColor: "surface",
          padding: "4px",
          borderRadius: "lg",
          border: "1px solid",
          borderColor: "border",
          width: "fit-content",
        })}
      >
        <button
          type="button"
          className={css({
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "md",
            fontSize: "sm",
            fontWeight: propertyCategory === "residential" ? "semibold" : "medium",
            backgroundColor: propertyCategory === "residential" ? "primary" : "transparent",
            color: propertyCategory === "residential" ? "white" : "text.muted",
            border: "none",
            cursor: "pointer",
            transition: "all 0.2s",
          })}
          onClick={() => switchToCategory("residential")}
        >
          <FaHome size={14} />
          Residential mortgage
        </button>
        <button
          type="button"
          className={css({
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "md",
            fontSize: "sm",
            fontWeight: propertyCategory === "btl" ? "semibold" : "medium",
            backgroundColor: propertyCategory === "btl" ? "emerald.500" : "transparent",
            color: propertyCategory === "btl" ? "white" : "text.muted",
            border: "none",
            cursor: "pointer",
            transition: "all 0.2s",
          })}
          onClick={() => switchToCategory("btl")}
        >
          <FaBuilding size={14} />
          Buy to let (BTL)
        </button>
      </div>

      {/* LTV Threshold Milestones (85%, 80%, 75%, 60%) */}
      <div
        className={css({
          padding: "16px 20px",
          borderRadius: "lg",
          backgroundColor: "surface",
          border: "1px solid",
          borderColor: "border",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        })}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div>
            <FLPText
              fontSize="xs"
              color="text.muted"
              fontWeight="semibold"
              textTransform="uppercase"
            >
              LTV threshold milestones
            </FLPText>
            <FLPHeading as="h3" size="sm" style={{ marginTop: "2px" }}>
              Current LTV: {currentLtv.toFixed(1)}% ({formatCurrency(loanAmount)} /{" "}
              {formatCurrency(propertyValue)})
            </FLPHeading>
          </div>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              padding: "3px 10px",
              borderRadius: "999px",
              backgroundColor: "rgba(99, 102, 241, 0.1)",
              color: "#6366f1",
            }}
          >
            Ownership share: {baseline.propertyOwnershipSharePct ?? 100}%
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "10px",
          }}
        >
          {ltvMilestones.map((m) => (
            <div
              key={m.targetLtvPct}
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                backgroundColor: m.isAchieved
                  ? "rgba(16, 185, 129, 0.08)"
                  : "rgba(245, 158, 11, 0.08)",
                border: `1px solid ${
                  m.isAchieved ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"
                }`,
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: "bold",
                    color: m.isAchieved ? "#10b981" : "#d97706",
                  }}
                >
                  {m.targetLtvPct}% LTV tier
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: m.isAchieved ? "#10b981" : "#d97706",
                  }}
                >
                  {m.isAchieved ? "✓ Unlocked" : "Locked"}
                </span>
              </div>
              <div style={{ fontSize: "11px", color: "var(--colors-text-muted)" }}>
                {m.isAchieved ? (
                  "Lowest rate tier active"
                ) : (
                  <>
                    <strong>{formatCurrency(m.lumpSumNeededGbp)}</strong> equity needed
                    {m.requiredMonthlyOverpaymentBeforeFixGbp && (
                      <div>
                        {formatCurrency(m.requiredMonthlyOverpaymentBeforeFixGbp)}/mo to unlock
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Buy to Let Portfolio Information Card when BTL is active */}
      {propertyCategory === "btl" && (
        <div
          className={css({
            padding: "16px 20px",
            borderRadius: "lg",
            backgroundColor: "rgba(16, 185, 129, 0.05)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          })}
        >
          <div
            className={css({
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            })}
          >
            <div className={css({ display: "flex", alignItems: "center", gap: "10px" })}>
              <FaBuilding className={css({ color: "emerald.500", fontSize: "18px" })} />
              <div>
                <FLPHeading
                  as="h4"
                  size="sm"
                  style={{ margin: 0, color: "var(--colors-emerald-500)" }}
                >
                  Buy to let portfolio overview
                </FLPHeading>
                <FLPText fontSize="xs" color="text.muted" style={{ margin: 0 }}>
                  Managing {profile.buyToLetCount ?? 1} propert
                  {(profile.buyToLetCount ?? 1) === 1 ? "y" : "ies"}
                </FLPText>
              </div>
            </div>

            <button
              type="button"
              className={css({
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "md",
                fontSize: "xs",
                fontWeight: "semibold",
                backgroundColor: "surface",
                color: "text.primary",
                border: "1px solid",
                borderColor: "border",
                cursor: "pointer",
                "&:hover": { borderColor: "primary" },
              })}
              onClick={() => navigate("/app/profile")}
            >
              Configure in profile <FaArrowRight size={10} />
            </button>
          </div>

          <div
            className={css({
              display: "grid",
              gridTemplateColumns: { base: "1fr 1fr", sm: "repeat(4, 1fr)" },
              gap: "12px",
              paddingTop: "10px",
              borderTop: "1px solid rgba(16, 185, 129, 0.15)",
            })}
          >
            <div>
              <FLPText fontSize="xs" color="text.muted">
                Gross monthly rent
              </FLPText>
              <FLPHeading as="h5" size="sm" color="text.primary">
                {btlMonthlyRent > 0 ? `${formatCurrency(btlMonthlyRent)}/mo` : "Not configured"}
              </FLPHeading>
            </div>

            <div>
              <FLPText fontSize="xs" color="text.muted">
                Gross rental yield
              </FLPText>
              <FLPHeading as="h5" size="sm" color="primary">
                {btlGrossYield ? `${btlGrossYield.toFixed(2)}%` : "—"}
              </FLPHeading>
            </div>

            <div>
              <FLPText fontSize="xs" color="text.muted">
                Mortgage payment
              </FLPText>
              <FLPHeading as="h5" size="sm" color="text.primary">
                {formatCurrency(btlMonthlyPayment)}/mo (
                {mortgageType === "interest-only" ? "IO" : "Repay"})
              </FLPHeading>
            </div>

            <div>
              <FLPText fontSize="xs" color="text.muted">
                Estimated net cash flow
              </FLPText>
              <FLPHeading
                as="h5"
                size="sm"
                color={btlNetCashflow >= 0 ? "emerald.500" : "destructive"}
              >
                {btlMonthlyRent > 0
                  ? `${btlNetCashflow >= 0 ? "+" : ""}${formatCurrency(btlNetCashflow)}/mo`
                  : "—"}
              </FLPHeading>
            </div>
          </div>

          {/* Section 24 Notice */}
          <div
            className={css({
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
              fontSize: "xs",
              color: "text.muted",
            })}
          >
            <FaInfoCircle className={css({ color: "blue.500", marginTop: "2px", flexShrink: 0 })} />
            <span>
              <strong>Section 24 rule:</strong> Buy to let finance costs receive a 20% tax credit
              rather than being deductible expenses from gross rental receipts.
            </span>
          </div>
        </div>
      )}

      {propertyCategory === "residential" &&
        profile.hasMortgage &&
        mortgageAccounts.length === 0 && (
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
                  Mortgage account missing
                </FLPHeading>
                <FLPText fontSize="xs" color="text.muted" style={{ margin: 0 }}>
                  You indicated that you have a mortgage in your profile, but no mortgage account
                  has been added to your accounts. Connect or add one to track it.
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
              Add account
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
          Mortgage tracker
        </button>
        <button
          className={tabBtnStyle(activeTab === "simulator")}
          type="button"
          onClick={() => setActiveTab("simulator")}
        >
          <FaChartLine size={14} />
          Overpayment simulator
        </button>
        <button
          className={tabBtnStyle(activeTab === "compare")}
          type="button"
          onClick={() => setActiveTab("compare")}
        >
          <FaCoins size={14} />
          Overpay vs save
        </button>
      </div>

      {/* Selected Tab content */}
      {activeTab === "tracker" && (
        <MortgageTracker
          interestRate={interestRate}
          loanAmount={loanAmount}
          mortgageAccounts={propertyCategory === "residential" ? mortgageAccounts : []}
          mortgageType={mortgageType}
          remainingTerm={remainingTerm}
          selectedAccountId={selectedAccountId}
          onInterestRateChange={setInterestRate}
          onLoanAmountChange={setLoanAmount}
          onMortgageTypeChange={setMortgageType}
          onRemainingTermChange={setRemainingTerm}
          onSelectAccount={(id) => {
            setSelectedAccountId(id);
            if (!id) {
              setLoanAmount(150000);
            }
          }}
        />
      )}

      {activeTab === "simulator" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <RemortgageShockSim currentBalance={loanAmount} currentRate={interestRate} />
          <OverpaymentSimulator
            interestRate={interestRate}
            loanAmount={loanAmount}
            mortgageType={mortgageType}
            overpayment={overpayment}
            remainingTerm={remainingTerm}
            onOverpaymentChange={setOverpayment}
          />
        </div>
      )}

      {activeTab === "compare" && (
        <OverpayVsSaveCompare
          interestRate={interestRate}
          loanAmount={loanAmount}
          mortgageType={mortgageType}
          overpayment={overpayment}
          remainingTerm={remainingTerm}
        />
      )}
    </div>
  );
};

export default MortgageContainer;
