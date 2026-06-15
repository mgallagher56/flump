import { css } from "@repo/ui/styled-system/css";
import { type FC, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FaArrowDown,
  FaArrowUp,
  FaBolt,
  FaBriefcase,
  FaChartLine,
  FaExchangeAlt,
  FaHome,
  FaPiggyBank,
  FaUtensils,
  FaWallet,
} from "react-icons/fa";
import { useLoaderData, useNavigate } from "react-router";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPCard from "~/components/core/cards/FLPCard";
import FLPBox from "~/components/core/structure/FLPBox";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import SetupChecklist from "~/components/dashboard/SetupChecklist";
import AddEditAccountsDialogBtn from "~/components/dialogs/addEditAccountsDialog/AddEditAccountsDialog";
import ConnectBankWizard from "~/components/dialogs/connectBankWizard/ConnectBankWizard";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import type { loader } from "~/routes/app._index";
import { currentMonth, currentYear } from "~/utils/utils";

const DashboardContainer: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    accounts = [],
    accountDetails = [],
    transactions = [],
    userProfile = null,
    budgetEntryCount = 0,
  } = useLoaderData<typeof loader>();
  const [chartRange, setChartRange] = useState<"6" | "12" | "all">("12");
  const [showConnectWizard, setShowConnectWizard] = useState(false);

  // Calculate Net Worth stats
  const stats = useMemo(() => {
    let totalAssets = 0;
    let totalLiabilities = 0;

    accounts.forEach((acc) => {
      const accDetails = accountDetails
        .filter((detail: any) => detail.account_id === acc.id)
        .sort((a: any, b: any) => {
          if (a.year !== b.year) return a.year - b.year;
          return a.month - b.month;
        });

      if (accDetails.length === 0) {
        const isAsset = ["Current", "Saving", "Owed", "Investment"].includes(acc.type);
        if (isAsset) totalAssets += acc.balance || 0;
        else totalLiabilities += acc.balance || 0;
        return;
      }

      const curIndex = accDetails.findIndex(
        (detail: any) => detail.month === currentMonth && detail.year === currentYear,
      );

      const balance =
        curIndex !== -1 ? accDetails[curIndex].value : accDetails[accDetails.length - 1].value;

      const isAsset = ["Current", "Saving", "Owed", "Investment"].includes(acc.type);
      if (isAsset) {
        totalAssets += balance;
      } else {
        totalLiabilities += balance;
      }
    });

    return {
      assets: totalAssets,
      liabilities: totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
    };
  }, [accounts, accountDetails]);

  // Net Worth trend data
  const trendData = useMemo(() => {
    const monthlyMap: {
      [key: string]: {
        assets: number;
        liabilities: number;
        netWorth: number;
        month: number;
        year: number;
      };
    } = {};

    accountDetails.forEach((detail: any) => {
      const key = `${detail.year}-${detail.month.toString().padStart(2, "0")}`;
      const account = accounts.find((acc) => acc.id === detail.account_id);
      if (!account) return;

      if (!monthlyMap[key]) {
        monthlyMap[key] = {
          assets: 0,
          liabilities: 0,
          netWorth: 0,
          month: detail.month,
          year: detail.year,
        };
      }

      const isAsset = ["Current", "Saving", "Owed", "Investment"].includes(account.type);
      if (isAsset) {
        monthlyMap[key].assets += detail.value;
      } else {
        monthlyMap[key].liabilities += detail.value;
      }
      monthlyMap[key].netWorth = monthlyMap[key].assets - monthlyMap[key].liabilities;
    });

    const sorted = Object.values(monthlyMap).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    const formatted = sorted.map((item) => {
      const date = new Date(item.year, item.month - 1);
      return {
        ...item,
        name: date.toLocaleString("default", { month: "short", year: "2-digit" }),
      };
    });

    if (chartRange === "6") {
      return formatted.slice(-6);
    }
    if (chartRange === "12") {
      return formatted.slice(-12);
    }
    return formatted;
  }, [accounts, accountDetails, chartRange]);

  // Asset allocation pie data
  const pieData = useMemo(() => {
    const typeTotals: { [key: string]: number } = {};
    accounts.forEach((acc) => {
      const isAsset = ["Current", "Saving", "Owed", "Investment"].includes(acc.type);
      if (!isAsset) return;

      const accDetails = accountDetails.filter((d: any) => d.account_id === acc.id);
      const balance =
        accDetails.length > 0
          ? (accDetails.find((d: any) => d.month === currentMonth && d.year === currentYear)
              ?.value ?? accDetails[accDetails.length - 1].value)
          : acc.balance || 0;

      typeTotals[acc.type] = (typeTotals[acc.type] || 0) + balance;
    });

    return Object.entries(typeTotals).map(([name, value]) => ({ name, value }));
  }, [accounts, accountDetails]);

  const mortgageAccount = useMemo(() => {
    return accounts.find((acc: any) => acc.type === "Mortgage");
  }, [accounts]);

  const mortgageDetails = useMemo(() => {
    if (!mortgageAccount) return null;
    const details = accountDetails.filter((d: any) => d.account_id === mortgageAccount.id);
    const balance =
      details.length > 0
        ? (details.find((d: any) => d.month === currentMonth && d.year === currentYear)?.value ??
          details[details.length - 1].value)
        : mortgageAccount.balance || 0;

    const loanAmount = Math.abs(balance);
    const interestRate = 4.5;
    const remainingTerm = 25;
    const i = interestRate / 100 / 12;
    const n = remainingTerm * 12;
    const monthlyPayment = (loanAmount * i * (1 + i) ** n) / ((1 + i) ** n - 1);

    return {
      name: mortgageAccount.name,
      balance: loanAmount,
      interestRate,
      remainingTerm,
      monthlyPayment:
        Number.isNaN(monthlyPayment) || !Number.isFinite(monthlyPayment) ? 0 : monthlyPayment,
    };
  }, [mortgageAccount, accountDetails]);

  const forecastSummary = useMemo(() => {
    const startingBalance = stats.assets;
    const interestRate = 5.0;
    const monthlySave = 250;
    const projectionYears = 10;
    const m = interestRate / 100 / 12;
    let projectedBalance = startingBalance;
    for (let month = 1; month <= projectionYears * 12; month++) {
      projectedBalance = projectedBalance * (1 + m) + monthlySave;
    }
    return {
      startingBalance,
      projectedBalance: Math.round(projectedBalance),
      years: projectionYears,
      interestRate,
      monthlySave,
    };
  }, [stats.assets]);

  const COLORS = ["#6363F1", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6", "#3B82F6"];

  const { formatCurrency } = useFormatCurrency();

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case "food":
        return <FaUtensils style={{ color: "#f97316" }} />;
      case "salary":
        return <FaBriefcase style={{ color: "#10b981" }} />;
      case "interest":
        return <FaPiggyBank style={{ color: "#a855f7" }} />;
      case "utilities":
        return <FaBolt style={{ color: "#3b82f6" }} />;
      default:
        return <FaExchangeAlt style={{ color: "#64748b" }} />;
    }
  };

  // Styles
  const gridStyle = css({
    display: "grid",
    gridTemplateColumns: { base: "1fr", md: "repeat(3, 1fr)" },
    gap: "24px",
    marginBottom: "32px",
  });

  const cardStyle = css({
    padding: "24px",
    borderRadius: "lg",
    backgroundColor: "card",
    border: "1px solid",
    borderColor: "border",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  });

  const netWorthCardStyle = css({
    padding: "24px",
    borderRadius: "lg",
    backgroundColor: "rgba(99, 99, 241, 0.08)",
    border: "1px solid",
    borderColor: "primary",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  });

  const mainLayoutGrid = css({
    display: "grid",
    gridTemplateColumns: { base: "1fr", lg: "2fr 1fr" },
    gap: "32px",
    alignItems: "start",
  });

  const sectionHeaderStyle = css({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    marginTop: "8px",
  });

  const listContainerStyle = css({
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  });

  const rowStyle = css({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px",
    borderRadius: "md",
    backgroundColor: "surface",
    border: "1px solid",
    borderColor: "border",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    "&:hover": {
      transform: "translateY(-1px)",
      boxShadow: "xs",
    },
  });

  const transactionItemStyle = css({
    display: "flex",
    alignItems: "center",
    gap: "16px",
  });

  const iconWrapperStyle = css({
    width: "40px",
    height: "40px",
    borderRadius: "full",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "background",
    border: "1px solid",
    borderColor: "border",
  });

  const badgeStyle = (category: string) => {
    let bg = "rgba(100, 116, 139, 0.1)";
    let color = "#64748b";
    switch (category?.toLowerCase()) {
      case "food":
        bg = "rgba(249, 115, 22, 0.1)";
        color = "#f97316";
        break;
      case "salary":
        bg = "rgba(16, 185, 129, 0.1)";
        color = "#10b981";
        break;
      case "interest":
        bg = "rgba(168, 85, 247, 0.1)";
        color = "#a855f7";
        break;
      case "utilities":
        bg = "rgba(59, 130, 246, 0.1)";
        color = "#3b82f6";
        break;
    }
    return css({
      fontSize: "10px",
      fontWeight: "bold",
      padding: "2px 8px",
      borderRadius: "full",
      backgroundColor: bg,
      color: color,
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    });
  };

  const amountStyle = (isPositive: boolean) =>
    css({
      fontWeight: "semibold",
      color: isPositive ? "success.500" : "text.primary",
    });

  const chartContainerStyle = css({
    height: "350px",
    width: "100%",
    paddingTop: "16px",
  });

  const donutContainerStyle = css({
    height: "220px",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });

  const chartFilterBtn = (active: boolean) =>
    css({
      fontSize: "xs",
      padding: "4px 12px",
      borderRadius: "md",
      backgroundColor: active ? "primary" : "transparent",
      color: active ? "primary.foreground" : "text.muted",
      border: "1px solid",
      borderColor: active ? "primary" : "border",
      cursor: "pointer",
      transition: "all 0.2s",
      "&:hover": {
        backgroundColor: active ? "primary.hover" : "secondary",
      },
    });

  return (
    <div style={{ paddingBottom: "48px" }}>
      {/* Setup Checklist */}
      <SetupChecklist
        completedSteps={
          (userProfile as { setupChecklistCompletedSteps?: string[] } | null)
            ?.setupChecklistCompletedSteps ?? []
        }
        hasAccounts={accounts.length > 0}
        hasBudget={budgetEntryCount > 0}
        hasMortgageAccount={accounts.some((a: { type: string }) => a.type === "Mortgage")}
        hasProfile={!!(userProfile as { annualSalary?: number | null } | null)?.annualSalary}
        hasRunForecast={false}
        onOpenBudgetWizard={() => navigate("/app/budget")}
        onOpenConnectBank={() => navigate(".", { replace: true })}
      />

      {/* Title block */}
      <div
        className={css({
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          my: 6,
          flexWrap: "wrap",
          gap: "16px",
        })}
      >
        <div>
          <FLPHeading as="h1" color="blue.500" size="xl">
            {t("dashboard")}
          </FLPHeading>
          <FLPText color="text.muted" fontSize="sm">
            Keep track of your financial overview, investments, and transactions.
          </FLPText>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <ConnectBankWizard onSuccess={() => navigate(".", { replace: true })} />
          <AddEditAccountsDialogBtn />
        </div>
      </div>

      {accounts.length === 0 ? (
        <div
          className={css({
            padding: "64px 32px",
            borderRadius: "lg",
            backgroundColor: "rgba(99, 99, 241, 0.04)",
            border: "1px dashed",
            borderColor: "primary",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "24px",
            my: 8,
          })}
        >
          <div
            className={css({
              width: "64px",
              height: "64px",
              borderRadius: "full",
              backgroundColor: "rgba(99, 99, 241, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              color: "primary",
            })}
          >
            <FaWallet />
          </div>
          <div style={{ maxWidth: "600px" }}>
            <FLPHeading as="h2" size="lg" mb={2}>
              Welcome to Flump
            </FLPHeading>
            <FLPText color="text.muted" fontSize="sm" style={{ lineHeight: "1.6" }}>
              To get started, connect your live bank feeds to sync accounts automatically, or create
              manual accounts to track your net worth, simulate mortgage overpayments, and forecast
              savings.
            </FLPText>
          </div>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
            <ConnectBankWizard onSuccess={() => navigate(".", { replace: true })} />
            <AddEditAccountsDialogBtn />
          </div>
        </div>
      ) : (
        <>
          {/* Metrics Summary Grid */}
          <div className={gridStyle}>
            <div className={netWorthCardStyle}>
              <div>
                <FLPText
                  color="text.muted"
                  fontSize="xs"
                  fontWeight="semibold"
                  textTransform="uppercase"
                >
                  Net Worth
                </FLPText>
                <FLPHeading
                  as="h2"
                  color={stats.netWorth >= 0 ? "success.500" : "destructive"}
                  mt={1}
                  size="2xl"
                >
                  {formatCurrency(stats.netWorth)}
                </FLPHeading>
              </div>
              <div style={{ width: "90px", height: "45px" }}>
                {trendData.length > 1 && (
                  <ResponsiveContainer height="100%" width="100%">
                    <AreaChart data={trendData}>
                      <Area
                        dataKey="netWorth"
                        dot={false}
                        fill="rgba(99, 99, 241, 0.15)"
                        stroke="#6363F1"
                        strokeWidth={1.5}
                        type="monotone"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className={cardStyle}>
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <FLPText
                  color="text.muted"
                  fontSize="xs"
                  fontWeight="semibold"
                  textTransform="uppercase"
                >
                  Total Assets
                </FLPText>
                <FaArrowUp style={{ color: "#10b981", fontSize: "12px" }} />
              </div>
              <FLPHeading as="h2" color="success.500" mt={1} size="xl">
                {formatCurrency(stats.assets)}
              </FLPHeading>
            </div>

            <div className={cardStyle}>
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <FLPText
                  color="text.muted"
                  fontSize="xs"
                  fontWeight="semibold"
                  textTransform="uppercase"
                >
                  Total Liabilities
                </FLPText>
                <FaArrowDown style={{ color: "#ef4444", fontSize: "12px" }} />
              </div>
              <FLPHeading as="h2" color="destructive" mt={1} size="xl">
                {formatCurrency(stats.liabilities)}
              </FLPHeading>
            </div>
          </div>

          {/* Main Grid: Charts & Details */}
          <div className={mainLayoutGrid}>
            {/* Left Column: Net Worth Chart & Transactions */}
            <FLPBox display="flex" flexDirection="column" gap={6}>
              {/* Net Worth Progression Chart */}
              <FLPCard>
                <div className={sectionHeaderStyle}>
                  <div>
                    <FLPHeading as="h3" size="md">
                      Net Worth Progression
                    </FLPHeading>
                    <FLPText color="text.muted" fontSize="xs">
                      Assets minus liabilities monthly growth
                    </FLPText>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      className={chartFilterBtn(chartRange === "6")}
                      type="button"
                      onClick={() => setChartRange("6")}
                    >
                      6M
                    </button>
                    <button
                      className={chartFilterBtn(chartRange === "12")}
                      type="button"
                      onClick={() => setChartRange("12")}
                    >
                      12M
                    </button>
                    <button
                      className={chartFilterBtn(chartRange === "all")}
                      type="button"
                      onClick={() => setChartRange("all")}
                    >
                      All
                    </button>
                  </div>
                </div>

                <div className={chartContainerStyle}>
                  {trendData.length > 0 ? (
                    <ResponsiveContainer height="100%" width="100%">
                      <AreaChart
                        data={trendData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorNetWorth" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="5%" stopColor="#6363F1" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#6363F1" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <XAxis
                          axisLine={false}
                          dataKey="name"
                          fontSize={11}
                          tickLine={false}
                          tickMargin={10}
                        />
                        <YAxis
                          axisLine={false}
                          fontSize={11}
                          tickFormatter={(val) => `£${val / 1000}k`}
                          tickLine={false}
                          tickMargin={10}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--colors-card)",
                            borderColor: "var(--colors-border)",
                            borderRadius: "8px",
                          }}
                          itemStyle={{ color: "var(--colors-text-primary)" }}
                          formatter={(value: any) => [formatCurrency(value), "Net Worth"]}
                          labelStyle={{ fontWeight: "bold", color: "var(--colors-text-muted)" }}
                        />
                        <Area
                          activeDot={{ r: 6 }}
                          dataKey="netWorth"
                          fill="url(#colorNetWorth)"
                          stroke="#6363F1"
                          strokeWidth={2.5}
                          type="monotone"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div
                      style={{
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <FLPText color="text.muted">No historical details found.</FLPText>
                    </div>
                  )}
                </div>
              </FLPCard>

              {/* Recent Transactions Panel */}
              <FLPCard>
                <div className={sectionHeaderStyle}>
                  <div>
                    <FLPHeading as="h3" size="md">
                      Recent Transactions
                    </FLPHeading>
                    <FLPText color="text.muted" fontSize="xs">
                      Your latest account movements
                    </FLPText>
                  </div>
                </div>

                <div className={listContainerStyle}>
                  {transactions.length > 0 ? (
                    transactions.slice(0, 5).map((tx: any) => {
                      const isPositive = tx.amount > 0;
                      const formattedAmount = isPositive
                        ? `+£${tx.amount.toFixed(2)}`
                        : `-£${Math.abs(tx.amount).toFixed(2)}`;
                      const dateStr = new Date(tx.timestamp).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      });
                      return (
                        <div key={tx.id} className={rowStyle}>
                          <div className={transactionItemStyle}>
                            <div className={iconWrapperStyle}>{getCategoryIcon(tx.category)}</div>
                            <div>
                              <FLPText fontWeight="semibold">{tx.description}</FLPText>
                              <FLPBox display="flex" gap={2} mt={1}>
                                <span className={badgeStyle(tx.category)}>{tx.category}</span>
                                <FLPText color="text.muted" fontSize="xs">
                                  {dateStr}
                                </FLPText>
                              </FLPBox>
                            </div>
                          </div>
                          <span className={amountStyle(isPositive)}>{formattedAmount}</span>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ padding: "32px", textAlign: "center" }}>
                      <FLPText color="text.muted">No transactions found.</FLPText>
                    </div>
                  )}
                </div>
              </FLPCard>
            </FLPBox>

            {/* Right Column: Asset Allocation & Widgets */}
            <FLPBox display="flex" flexDirection="column" gap={6}>
              {/* Asset Allocation Donut Chart */}
              <FLPCard>
                <div className={sectionHeaderStyle}>
                  <div>
                    <FLPHeading as="h3" size="md">
                      Asset Allocation
                    </FLPHeading>
                    <FLPText color="text.muted" fontSize="xs">
                      Balance weight by account type
                    </FLPText>
                  </div>
                </div>

                <div className={donutContainerStyle}>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer height="100%" width="100%">
                      <PieChart>
                        <Pie
                          cx="50%"
                          cy="50%"
                          data={pieData}
                          dataKey="value"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={4}
                        >
                          {pieData.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--colors-card)",
                            borderColor: "var(--colors-border)",
                            borderRadius: "8px",
                          }}
                          itemStyle={{ color: "var(--colors-text-primary)" }}
                          formatter={(value: any) => [formatCurrency(value)]}
                          labelStyle={{ color: "var(--colors-text-muted)" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div
                      style={{
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <FLPText color="text.muted">No asset accounts found.</FLPText>
                    </div>
                  )}
                </div>

                {/* Allocation Legend */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    marginTop: "12px",
                  }}
                >
                  {pieData.map((item, index) => {
                    const totalValue = pieData.reduce((acc, curr) => acc + curr.value, 0);
                    const percent =
                      totalValue > 0 ? Math.round((item.value / totalValue) * 100) : 0;
                    return (
                      <div
                        key={item.name}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "12px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div
                            style={{
                              width: "10px",
                              height: "10px",
                              borderRadius: "50%",
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />
                          <FLPText fontWeight="medium">{item.name}</FLPText>
                        </div>
                        <FLPText color="text.muted">
                          {formatCurrency(item.value)} ({percent}%)
                        </FLPText>
                      </div>
                    );
                  })}
                </div>
              </FLPCard>

              {/* Account Quick List */}
              <FLPCard>
                <div className={sectionHeaderStyle}>
                  <div>
                    <FLPHeading as="h3" size="md">
                      Accounts Overview
                    </FLPHeading>
                  </div>
                  <FLPButton size="sm" variant="link" onClick={() => navigate("/app/accounts")}>
                    View All
                  </FLPButton>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {accounts.slice(0, 4).map((acc) => {
                    const accDetails = accountDetails.filter((d: any) => d.account_id === acc.id);
                    const balance =
                      accDetails.length > 0
                        ? (accDetails.find(
                            (d: any) => d.month === currentMonth && d.year === currentYear,
                          )?.value ?? accDetails[accDetails.length - 1].value)
                        : acc.balance || 0;

                    return (
                      <div
                        key={acc.id}
                        className={css({
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px",
                          borderRadius: "md",
                          border: "1px solid",
                          borderColor: "border",
                          cursor: "pointer",
                          "&:hover": { backgroundColor: "surface" },
                        })}
                        onClick={() => navigate(`/app/accounts/${acc.id}`)}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div
                            className={css({
                              width: "32px",
                              height: "32px",
                              borderRadius: "md",
                              backgroundColor: "rgba(99, 99, 241, 0.08)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            })}
                          >
                            <FaWallet style={{ color: "#6363F1", fontSize: "14px" }} />
                          </div>
                          <div>
                            <FLPText fontSize="sm" fontWeight="semibold">
                              {acc.name}
                            </FLPText>
                            <FLPText color="text.muted" fontSize="xs">
                              {acc.type}
                            </FLPText>
                          </div>
                        </div>
                        <FLPText fontSize="sm" fontWeight="bold">
                          {formatCurrency(balance)}
                        </FLPText>
                      </div>
                    );
                  })}
                </div>
              </FLPCard>

              {/* Mortgage Overview Widget */}
              <FLPCard>
                <div className={sectionHeaderStyle}>
                  <div>
                    <FLPHeading as="h3" size="md">
                      Mortgage Overview
                    </FLPHeading>
                    <FLPText color="text.muted" fontSize="xs">
                      {mortgageDetails
                        ? "Synced mortgage tracker summary"
                        : "Simulate payments & interest savings"}
                    </FLPText>
                  </div>
                </div>

                {mortgageDetails ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <FLPText
                          color="text.muted"
                          fontSize="xs"
                          fontWeight="semibold"
                          textTransform="uppercase"
                        >
                          Remaining Balance
                        </FLPText>
                        <FLPHeading as="h4" color="destructive" mt={0.5} size="md">
                          {formatCurrency(mortgageDetails.balance)}
                        </FLPHeading>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <FLPText
                          color="text.muted"
                          fontSize="xs"
                          fontWeight="semibold"
                          textTransform="uppercase"
                        >
                          Monthly Payment
                        </FLPText>
                        <FLPHeading as="h4" color="primary" mt={0.5} size="md">
                          {formatCurrency(mortgageDetails.monthlyPayment)}/mo
                        </FLPHeading>
                      </div>
                    </div>
                    <div
                      className={css({
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        borderRadius: "md",
                        backgroundColor: "surface",
                        border: "1px solid",
                        borderColor: "border",
                        fontSize: "xs",
                      })}
                    >
                      <FLPText color="text.muted">
                        Rate: <strong>{mortgageDetails.interestRate}%</strong>
                      </FLPText>
                      <FLPText color="text.muted">
                        Term: <strong>{mortgageDetails.remainingTerm} yrs</strong>
                      </FLPText>
                    </div>
                    <FLPButton
                      size="sm"
                      variant="outline"
                      onClick={() => navigate("/app/mortgage")}
                      style={{ width: "100%", marginTop: "4px" }}
                    >
                      <FaHome style={{ marginRight: "6px" }} />
                      Analyze Payments
                    </FLPButton>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <FLPText fontSize="sm" color="text.muted" style={{ lineHeight: "1.5" }}>
                      Calculate amortization, simulate overpayment interest savings, and optimize
                      savings.
                    </FLPText>
                    <FLPButton
                      size="sm"
                      variant="outline"
                      onClick={() => navigate("/app/mortgage")}
                      style={{ width: "100%", marginTop: "4px" }}
                    >
                      <FaHome style={{ marginRight: "6px" }} />
                      Open Mortgage Tools
                    </FLPButton>
                  </div>
                )}
              </FLPCard>

              {/* Savings Forecast Widget */}
              <FLPCard>
                <div className={sectionHeaderStyle}>
                  <div>
                    <FLPHeading as="h3" size="md">
                      Savings Forecast
                    </FLPHeading>
                    <FLPText color="text.muted" fontSize="xs">
                      Projected asset growth over 10 years
                    </FLPText>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <FLPText
                      color="text.muted"
                      fontSize="xs"
                      fontWeight="semibold"
                      textTransform="uppercase"
                    >
                      Projected Assets (10 Yrs)
                    </FLPText>
                    <FLPHeading as="h4" color="success.500" mt={0.5} size="lg">
                      {formatCurrency(forecastSummary.projectedBalance)}
                    </FLPHeading>
                  </div>
                  <FLPText fontSize="xs" color="text.muted" style={{ lineHeight: "1.5" }}>
                    Projected from current assets of{" "}
                    <strong>{formatCurrency(forecastSummary.startingBalance)}</strong> at{" "}
                    <strong>{forecastSummary.interestRate}%</strong> expected growth, saving{" "}
                    <strong>{formatCurrency(forecastSummary.monthlySave)}/mo</strong>.
                  </FLPText>
                  <FLPButton
                    size="sm"
                    variant="outline"
                    onClick={() => navigate("/app/forecast")}
                    style={{ width: "100%", marginTop: "4px" }}
                  >
                    <FaChartLine style={{ marginRight: "6px" }} />
                    Run Savings Forecast
                  </FLPButton>
                </div>
              </FLPCard>
            </FLPBox>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardContainer;
