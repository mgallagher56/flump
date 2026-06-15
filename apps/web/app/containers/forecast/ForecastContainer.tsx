import { css } from "@repo/ui/styled-system/css";
import { type FC, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaCalculator, FaChartLine } from "react-icons/fa";
import { useLoaderData } from "react-router";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import SavingsForecaster from "~/components/forecast/SavingsForecaster";
import UKTaxCalculator from "~/components/forecast/UKTaxCalculator";
import { useUserProfile } from "~/hooks/useUserProfile";
import type { loader } from "~/routes/app.forecast";
import { currentMonth, currentYear } from "~/utils/utils";

const ForecastContainer: FC = () => {
  const { t } = useTranslation();
  const { accounts = [], accountDetails = [], userProfile } = useLoaderData<typeof loader>();
  const [activeTab, setActiveTab] = useState<"forecaster" | "calculator">("forecaster");

  const { profile, setProfile } = useUserProfile();

  // Sync profile from loader into atom
  useEffect(() => {
    if (userProfile) setProfile(userProfile);
  }, [userProfile, setProfile]);

  // Calculate total current savings assets
  const totalAssets = useMemo(() => {
    let sum = 0;
    accounts.forEach((acc: any) => {
      const isAsset = ["Current", "Saving", "Investment", "Owed"].includes(acc.type);
      if (!isAsset) return;

      const accDetails = accountDetails.filter((d: any) => d.account_id === acc.id);
      const balance =
        accDetails.length > 0
          ? (accDetails.find((d: any) => d.month === currentMonth && d.year === currentYear)
              ?.value ?? accDetails[accDetails.length - 1].value)
          : acc.balance || 0;
      sum += balance;
    });
    return sum;
  }, [accounts, accountDetails]);

  // Estimate average savings rate based on history
  const computedAverageSavingRate = useMemo(() => {
    const monthlyMap: { [key: string]: number } = {};
    accountDetails.forEach((d: any) => {
      const acc = accounts.find((a: any) => a.id === d.account_id);
      if (!acc || !["Current", "Saving", "Investment", "Owed"].includes(acc.type)) return;

      const key = `${d.year}-${d.month.toString().padStart(2, "0")}`;
      monthlyMap[key] = (monthlyMap[key] || 0) + d.value;
    });

    const sortedVals = Object.entries(monthlyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map((entry) => entry[1]);

    if (sortedVals.length < 2) return 250; // default

    let diffSum = 0;
    for (let i = 1; i < sortedVals.length; i++) {
      diffSum += sortedVals[i] - sortedVals[i - 1];
    }
    const avg = diffSum / (sortedVals.length - 1);
    return avg > 0 ? Math.round(avg) : 250;
  }, [accounts, accountDetails]);

  // Shared states for calculators
  const [startingBalance, setStartingBalance] = useState<number>(0);
  const [currentSavingRate, setCurrentSavingRate] = useState<number>(0);
  const [hypotheticalSavingRate, setHypotheticalSavingRate] = useState<number>(0);
  const [netSalaryIncrease, setNetSalaryIncrease] = useState<number>(0);

  // Pre-populate with user's actual data when loaded
  useEffect(() => {
    setStartingBalance(totalAssets);
    setCurrentSavingRate(computedAverageSavingRate);
    setHypotheticalSavingRate(Math.round(computedAverageSavingRate * 1.5) || 500);
  }, [totalAssets, computedAverageSavingRate]);

  const applySalaryIncreaseToSavings = (monthlyIncrease: number) => {
    setNetSalaryIncrease(monthlyIncrease);
    setHypotheticalSavingRate((prev) => prev + Math.round(monthlyIncrease));
    setActiveTab("forecaster"); // Switch back to forecaster to see impact!
  };

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
          Forecast & Tools
        </FLPHeading>
        <FLPText color="text.muted" fontSize="sm">
          Calculate your UK take-home salary and forecast your future savings potential.
        </FLPText>
      </div>

      {/* Tabs */}
      <div className={tabContainerStyle}>
        <button
          className={tabBtnStyle(activeTab === "forecaster")}
          type="button"
          onClick={() => setActiveTab("forecaster")}
        >
          <FaChartLine size={14} />
          Savings Forecaster
        </button>
        <button
          className={tabBtnStyle(activeTab === "calculator")}
          type="button"
          onClick={() => setActiveTab("calculator")}
        >
          <FaCalculator size={14} />
          UK Take-Home Pay Calculator
        </button>
      </div>

      {/* Render selected tab */}
      {activeTab === "forecaster" ? (
        <SavingsForecaster
          currentSavingRate={currentSavingRate}
          hypotheticalSavingRate={hypotheticalSavingRate}
          startingBalance={startingBalance}
          onCurrentRateChange={setCurrentSavingRate}
          onHypotheticalRateChange={setHypotheticalSavingRate}
          onStartingBalanceChange={setStartingBalance}
          salaryIncrease={netSalaryIncrease}
          onClearIncrease={() => setNetSalaryIncrease(0)}
        />
      ) : (
        <UKTaxCalculator
          initialSalary={profile.annualSalary}
          onApplyIncrease={applySalaryIncreaseToSavings}
        />
      )}
    </div>
  );
};

export default ForecastContainer;
