import { calculateSafeToSpend, evaluateFinancialStage } from "@repo/common";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useMemo, useState } from "react";
import {
  FaEyeSlash,
  FaFire,
  FaGripVertical,
  FaPlus,
  FaRedo,
  FaRocket,
  FaSlidersH,
} from "react-icons/fa";
import { Link } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import SetupChecklist, { type SetupChecklistProps } from "~/components/setup/SetupChecklist";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { normalizeProfile, type UserProfile, useUserProfile } from "~/hooks/useUserProfile";
import {
  ALL_PAGE_KEYS,
  type AppPageKey,
  DASHBOARD_WIDGET_METAS,
  type DashboardWidgetKey,
  DEFAULT_DASHBOARD_WIDGETS,
  DEFAULT_WIDGET_SIZES,
} from "~/utils/pageConfig";
import { AccountsWidget } from "./widgets/AccountsWidget";
import { BudgetWidget } from "./widgets/BudgetWidget";
import { DebtWidget } from "./widgets/DebtWidget";
import { ForecastWidget } from "./widgets/ForecastWidget";
import { MortgageWidget } from "./widgets/MortgageWidget";
import { PensionWidget } from "./widgets/PensionWidget";
import { SavingsWidget } from "./widgets/SavingsWidget";
import { TaxWidget } from "./widgets/TaxWidget";

export interface HomeDashboardProps {
  user: any;
  checklistProps: SetupChecklistProps;
  userProfile?: Partial<UserProfile> | UserProfile;
  accountsData: any;
  budgetData: any;
  savingsData: any;
  pensionData: any;
  mortgageData: any;
  forecastData: any;
  taxData: any;
  debtData?: any;
}

export const HomeDashboard: FC<HomeDashboardProps> = ({
  user: _user,
  checklistProps,
  userProfile,
  accountsData,
  budgetData,
  savingsData,
  pensionData,
  mortgageData,
  forecastData,
  taxData,
  debtData,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const { profile: hookProfile, updateProfile } = useUserProfile();
  const profile = useMemo(() => {
    if (userProfile) {
      return normalizeProfile(userProfile);
    }
    return hookProfile;
  }, [userProfile, hookProfile]);

  const [editMode, setEditMode] = useState(false);
  const [draggedKey, setDraggedKey] = useState<DashboardWidgetKey | null>(null);

  // Financial Lifecycle Stage evaluation
  const financialStage = useMemo(() => {
    if (!debtData && !(accountsData?.totalLiabilities > 0)) {
      return null;
    }
    const debts = debtData?.debts || [];
    return evaluateFinancialStage({
      debts,
      monthlySurplus: budgetData?.monthlySurplus ?? 0,
      liquidSavings: savingsData?.totalSavingsBalance ?? accountsData?.typeTotals?.Saving ?? 0,
      monthlyEssentialExpenses: budgetData?.monthlyExpenses ?? 1500,
    });
  }, [debtData, accountsData, budgetData, savingsData]);

  // Safe-to-Spend weekly allowance metric
  const safeToSpend = useMemo(() => {
    if (!budgetData) return null;
    const income = budgetData.monthlyIncome || 0;
    const living = budgetData.livingExpenses || budgetData.monthlyExpenses || 0;
    const minDebt = debtData?.monthlyMinimumTotal || 0;
    return calculateSafeToSpend(income, living * 0.6, minDebt, living * 0.4);
  }, [budgetData, debtData]);

  // Enabled pages according to UserProfile
  const enabledPages = useMemo<AppPageKey[]>(() => {
    return (profile.enabledPages as AppPageKey[]) || ALL_PAGE_KEYS;
  }, [profile.enabledPages]);

  // Candidate widgets applicable to the user
  const availableWidgetKeys = useMemo<DashboardWidgetKey[]>(() => {
    return [...enabledPages];
  }, [enabledPages]);

  // Active dashboard widgets
  const dashboardWidgets = useMemo<DashboardWidgetKey[]>(() => {
    const raw = (profile.dashboardWidgets as DashboardWidgetKey[]) || DEFAULT_DASHBOARD_WIDGETS;
    return raw.filter((k) => enabledPages.includes(k as AppPageKey));
  }, [profile.dashboardWidgets, enabledPages]);

  // Disabled widgets: applicable widgets currently removed from dashboardWidgets
  const disabledWidgets = useMemo<DashboardWidgetKey[]>(() => {
    return availableWidgetKeys.filter((k) => !dashboardWidgets.includes(k));
  }, [availableWidgetKeys, dashboardWidgets]);

  // Widget order
  const widgetOrder = useMemo<DashboardWidgetKey[]>(() => {
    const raw = (profile.dashboardWidgetOrder as DashboardWidgetKey[]) || DEFAULT_DASHBOARD_WIDGETS;
    const filtered = raw.filter((k) => enabledPages.includes(k as AppPageKey));
    // Append any missing enabled widgets
    enabledPages.forEach((k) => {
      if (!filtered.includes(k)) filtered.push(k);
    });
    return filtered;
  }, [profile.dashboardWidgetOrder, enabledPages]);

  const widgetSizes = profile.dashboardWidgetSizes || DEFAULT_WIDGET_SIZES;
  const widgetConfig = profile.dashboardWidgetConfig || {};

  // Actions
  const handleEnableWidget = async (key: DashboardWidgetKey) => {
    // Put key at the bottom of the widget order so it appears at the end of the enabled section
    const remainingOrder = widgetOrder.filter((k) => k !== key);
    const newOrder = [...remainingOrder, key];
    const newWidgets = [...dashboardWidgets, key];
    await updateProfile({
      dashboardWidgets: newWidgets,
      dashboardWidgetOrder: newOrder,
    });
  };

  const handleToggleWidget = async (key: DashboardWidgetKey) => {
    const isVisible = dashboardWidgets.includes(key);
    if (isVisible) {
      const updated = dashboardWidgets.filter((k) => k !== key);
      await updateProfile({ dashboardWidgets: updated });
    } else {
      await handleEnableWidget(key);
    }
  };

  const handleToggleSize = async (key: DashboardWidgetKey) => {
    const current = widgetSizes[key] || "normal";
    const next = current === "wide" ? "normal" : "wide";
    await updateProfile({
      dashboardWidgetSizes: { ...widgetSizes, [key]: next },
    });
  };

  const handleMove = async (key: DashboardWidgetKey, direction: "up" | "down") => {
    const idx = widgetOrder.indexOf(key);
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= widgetOrder.length) return;

    const newOrder = [...widgetOrder];
    const [moved] = newOrder.splice(idx, 1);
    newOrder.splice(targetIdx, 0, moved);

    await updateProfile({ dashboardWidgetOrder: newOrder });
  };

  const handleUpdateWidgetConfig = async (key: DashboardWidgetKey, cfg: any) => {
    await updateProfile({
      dashboardWidgetConfig: {
        ...widgetConfig,
        [key]: cfg,
      },
    });
  };

  const handleResetLayout = async () => {
    await updateProfile({
      dashboardWidgets: [...enabledPages],
      dashboardWidgetOrder: [...ALL_PAGE_KEYS],
      dashboardWidgetSizes: { ...DEFAULT_WIDGET_SIZES },
      dashboardWidgetConfig: {},
    });
  };

  // Drag and drop handlers
  const handleDragStart = (key: DashboardWidgetKey) => (e: React.DragEvent) => {
    setDraggedKey(key);
    e.dataTransfer.setData("text/plain", key);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (targetKey: DashboardWidgetKey) => async (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedKey || draggedKey === targetKey) return;

    const fromIdx = widgetOrder.indexOf(draggedKey);
    const toIdx = widgetOrder.indexOf(targetKey);
    if (fromIdx === -1 || toIdx === -1) return;

    const newOrder = [...widgetOrder];
    const [moved] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, moved);

    setDraggedKey(null);
    await updateProfile({ dashboardWidgetOrder: newOrder });
  };

  const isModuleConfigured = (key: DashboardWidgetKey): boolean => {
    switch (key) {
      case "accounts":
        return Boolean(checklistProps.hasAccounts || (accountsData?.accountsCount ?? 0) > 0);
      case "budget":
        return Boolean(
          checklistProps.hasBudget ||
            budgetData?.monthlyIncome > 0 ||
            budgetData?.monthlyExpenses > 0 ||
            checklistProps.completedSteps?.includes("budget"),
        );
      case "savings":
        return Boolean(
          (savingsData?.accountsCount ?? 0) > 0 ||
            checklistProps.hasSavings ||
            checklistProps.completedSteps?.includes("savings"),
        );
      case "pension":
        return Boolean(
          (pensionData?.potsCount ?? 0) > 0 ||
            checklistProps.hasPension ||
            checklistProps.completedSteps?.includes("pension"),
        );
      case "mortgage":
        return Boolean(
          (mortgageData?.hasMortgageAccount && mortgageData?.mortgageBalance > 0) ||
            checklistProps.hasMortgageAccount ||
            checklistProps.completedSteps?.includes("mortgage"),
        );
      case "forecast":
        return Boolean(
          checklistProps.hasRunForecast || checklistProps.completedSteps?.includes("forecast"),
        );
      case "tax":
        return Boolean(checklistProps.hasTax || (taxData?.recordsCount ?? 0) > 0);
      case "debt":
        return Boolean(
          debtData?.totalDebt > 0 ||
            (accountsData?.totalLiabilities ?? 0) > 0 ||
            checklistProps.completedSteps?.includes("debt"),
        );
      default:
        return false;
    }
  };

  // Render ordered visible widgets (in normal mode, only show if configured)
  const visibleWidgets = useMemo(() => {
    return widgetOrder.filter((k) => {
      if (!dashboardWidgets.includes(k)) return false;
      if (editMode) return true;
      return isModuleConfigured(k);
    });
  }, [
    widgetOrder,
    dashboardWidgets,
    editMode,
    accountsData,
    budgetData,
    savingsData,
    pensionData,
    mortgageData,
    forecastData,
    taxData,
    checklistProps,
    enabledPages,
  ]);

  return (
    <div
      className={css({
        maxWidth: "100%",
        margin: "0 auto",
        paddingTop: { base: "12px", md: "20px" },
        paddingBottom: { base: "24px", md: "40px" },
        paddingX: { base: "10px", sm: "16px", md: "24px" },
        display: "flex",
        flexDirection: "column",
        gap: { base: "16px", md: "24px" },
      })}
    >
      {/* Top Header & Quick Customize Bar */}
      <div
        className={css({
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          paddingBottom: "16px",
          borderBottom: "1px solid",
          borderColor: "border",
        })}
      >
        <div>
          <FLPHeading as="h1" color="blue.500" size="xl">
            Welcome back{profile.displayName ? `, ${profile.displayName}` : ""}
          </FLPHeading>
          <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "2px" }}>
            Here is your live financial snapshot across your active modules.
          </FLPText>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {editMode && (
            <button
              type="button"
              className={css({
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "xs",
                color: "text.muted",
                background: "transparent",
                border: "1px solid",
                borderColor: "border",
                borderRadius: "md",
                padding: "6px 12px",
                cursor: "pointer",
                _hover: { color: "primary", borderColor: "primary" },
              })}
              onClick={handleResetLayout}
            >
              <FaRedo size={11} /> Reset Default
            </button>
          )}
          <FLPButton
            size="sm"
            variant={editMode ? "primary" : "outline"}
            onClick={() => setEditMode((prev) => !prev)}
          >
            <FaSlidersH style={{ marginRight: "6px" }} />
            {editMode ? "Done Customizing" : "Customize Dashboard"}
          </FLPButton>
        </div>
      </div>

      {/* Onboarding Checklist */}
      <SetupChecklist {...checklistProps} enabledPages={enabledPages} />

      {/* Stage 1: Stabilize & Clear Hero Banner */}
      {financialStage?.stage === "stabilize" && (
        <div
          className={css({
            padding: "20px 24px",
            borderRadius: "xl",
            backgroundColor: "rgba(239, 68, 68, 0.06)",
            border: "1px solid",
            borderColor: "rgba(239, 68, 68, 0.25)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          })}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "full",
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ef4444",
                flexShrink: 0,
              }}
            >
              <FaFire size={22} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "bold",
                    backgroundColor: "#ef4444",
                    color: "white",
                    padding: "2px 8px",
                    borderRadius: "full",
                    textTransform: "uppercase",
                  }}
                >
                  Stage 1: Stabilize & Clear
                </span>
                <span style={{ fontSize: "12px", color: "var(--colors-text-muted)" }}>
                  Priority: Eliminate High-Cost Unsecured Liabilities
                </span>
              </div>
              <div
                style={{ marginTop: "4px", display: "flex", alignItems: "baseline", gap: "12px" }}
              >
                <span style={{ fontSize: "24px", fontWeight: "bold", color: "#ef4444" }}>
                  {formatCurrency(financialStage.totalUnsecuredDebt || debtData?.totalDebt || 0)}
                </span>
                <span style={{ fontSize: "13px", color: "var(--colors-text-muted)" }}>
                  Unsecured Debt Remaining • Targeted Debt-Free:{" "}
                  {debtData?.debtFreeDate || "Calculated in Engine"}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {safeToSpend && (
              <div
                className={css({
                  backgroundColor: "surface",
                  border: "1px solid",
                  borderColor: "rgba(239, 68, 68, 0.2)",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  textAlign: "right",
                })}
              >
                <div className={css({ fontSize: "11px", color: "text.muted" })}>
                  Safe-to-Spend Allowance
                </div>
                <div
                  className={css({ fontSize: "16px", fontWeight: "bold", color: "text.primary" })}
                >
                  {formatCurrency(safeToSpend.weeklyAllowance)} / week
                </div>
              </div>
            )}
            <Link to="/app/debt">
              <FLPButton size="sm" variant="primary">
                Open Debt Crusher →
              </FLPButton>
            </Link>
          </div>
        </div>
      )}

      {/* Customize Mode Reorder Banner */}
      {editMode && (
        <div
          className={css({
            padding: "12px 16px",
            backgroundColor: "rgba(99, 99, 241, 0.08)",
            border: "1px solid",
            borderColor: "primary",
            borderRadius: "lg",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "xs",
            color: "text.primary",
          })}
        >
          <FaGripVertical size={14} className={css({ color: "primary", flexShrink: 0 })} />
          <span>
            <strong>Reorder mode active:</strong> Click and drag any widget card or grip handle to
            rearrange your dashboard. Use the controls on each card to resize (1x / 2x), customize,
            or hide.
          </span>
        </div>
      )}

      {/* Widget Grid - 2 columns across all screen sizes */}
      {visibleWidgets.length === 0 ? (
        <div
          className={css({
            textAlign: "center",
            padding: "48px 24px",
            borderRadius: "xl",
            border: "1px dashed",
            borderColor: "border",
            backgroundColor: "surface",
          })}
        >
          {editMode ? (
            <>
              <FLPHeading as="h3" size="md">
                No widgets currently visible
              </FLPHeading>
              <FLPText
                color="text.muted"
                fontSize="sm"
                style={{ marginTop: "4px", marginBottom: "16px" }}
              >
                All widgets are hidden or their pages are disabled. Click below to restore the
                default widgets.
              </FLPText>
              <FLPButton size="sm" variant="primary" onClick={handleResetLayout}>
                Restore Default Widgets
              </FLPButton>
            </>
          ) : (
            <>
              <div
                className={css({
                  width: "48px",
                  height: "48px",
                  borderRadius: "full",
                  backgroundColor: "rgba(99, 99, 241, 0.1)",
                  color: "primary",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                  fontSize: "20px",
                })}
              >
                <FaRocket />
              </div>
              <FLPHeading as="h3" size="md">
                Ready to Build Your Dashboard
              </FLPHeading>
              <FLPText
                color="text.muted"
                fontSize="sm"
                style={{ marginTop: "4px", maxWidth: "440px", marginInline: "auto" }}
              >
                Complete your setup tasks in the checklist above. As you finish each section, its
                live widget will automatically appear right here!
              </FLPText>
            </>
          )}
        </div>
      ) : (
        <div
          className={css({
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            alignItems: "stretch",
            gap: { base: "10px", sm: "14px", md: "20px" },
          })}
        >
          {visibleWidgets.map((key, index) => {
            const size = widgetSizes[key] || "normal";
            const cfg = widgetConfig[key] || {};
            const isFirst = index === 0;
            const isLast = index === visibleWidgets.length - 1;

            const isDragging = draggedKey === key;
            const dragProps = editMode
              ? {
                  draggable: true,
                  isDragging,
                  onDragStart: handleDragStart(key),
                  onDragOver: handleDragOver,
                  onDrop: handleDrop(key),
                  onDragEnd: () => setDraggedKey(null),
                }
              : undefined;

            const commonProps = {
              editMode,
              size,
              isFirst,
              isLast,
              dragProps,
              onToggleSize: () => handleToggleSize(key),
              onHide: () => handleToggleWidget(key),
              onMoveUp: () => handleMove(key, "up"),
              onMoveDown: () => handleMove(key, "down"),
              onUpdateConfig: (newCfg: any) => handleUpdateWidgetConfig(key, newCfg),
            };

            switch (key) {
              case "accounts":
                return (
                  <AccountsWidget
                    key="accounts"
                    {...commonProps}
                    config={cfg}
                    data={accountsData}
                  />
                );
              case "budget":
                return (
                  <BudgetWidget
                    key="budget"
                    {...commonProps}
                    config={cfg}
                    data={{
                      ...budgetData,
                      annualSalary:
                        profile.annualSalary ?? forecastData?.annualSalary ?? taxData?.totalIncome,
                    }}
                  />
                );
              case "debt":
                return <DebtWidget key="debt" {...commonProps} config={cfg} data={debtData} />;
              case "savings":
                return (
                  <SavingsWidget key="savings" {...commonProps} config={cfg} data={savingsData} />
                );
              case "pension":
                return (
                  <PensionWidget key="pension" {...commonProps} config={cfg} data={pensionData} />
                );
              case "mortgage":
                return (
                  <MortgageWidget
                    key="mortgage"
                    {...commonProps}
                    config={cfg}
                    data={mortgageData}
                  />
                );
              case "forecast":
                return (
                  <ForecastWidget
                    key="forecast"
                    {...commonProps}
                    config={cfg}
                    data={forecastData}
                  />
                );
              case "tax":
                return <TaxWidget key="tax" {...commonProps} config={cfg} data={taxData} />;
              default:
                return null;
            }
          })}
        </div>
      )}

      {/* Disabled / Hidden Widgets Section when customizing */}
      {editMode && disabledWidgets.length > 0 && (
        <div
          className={css({
            marginTop: { base: "8px", md: "16px" },
            paddingTop: { base: "16px", md: "24px" },
            borderTop: "1px dashed",
            borderColor: "border",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          })}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FaEyeSlash size={14} style={{ color: "var(--colors-text-muted)" }} />
                <FLPHeading as="h3" size="sm">
                  Disabled Widgets ({disabledWidgets.length})
                </FLPHeading>
              </div>
              <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "2px" }}>
                These widgets are currently removed. Click 'Add' to re-enable any widget at the
                bottom of your dashboard.
              </FLPText>
            </div>
          </div>

          <div
            className={css({
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: { base: "10px", sm: "14px", md: "16px" },
            })}
          >
            {disabledWidgets.map((key) => {
              const meta = DASHBOARD_WIDGET_METAS[key];
              if (!meta) return null;
              return (
                <div
                  key={key}
                  className={css({
                    padding: { base: "10px 12px", sm: "12px 14px", md: "14px 16px" },
                    borderRadius: "lg",
                    backgroundColor: "surface",
                    border: "1px dashed",
                    borderColor: "border",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: { base: "8px", md: "12px" },
                    transition: "all 0.15s ease",
                    _hover: {
                      borderColor: "primary",
                      backgroundColor: "rgba(99, 102, 241, 0.03)",
                    },
                  })}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: meta.badgeColor || "var(--colors-primary)",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <FLPText
                        fontSize="xs"
                        className={css({
                          fontSize: { base: "xs", sm: "sm" },
                          fontWeight: "semibold",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        })}
                      >
                        {meta.label}
                      </FLPText>
                      <FLPText
                        color="text.muted"
                        fontSize="11px"
                        className={css({
                          display: { base: "none", sm: "block" },
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          marginTop: "1px",
                        })}
                      >
                        {meta.description}
                      </FLPText>
                    </div>
                  </div>

                  <FLPButton
                    size="sm"
                    variant="outline"
                    aria-label={`Enable ${meta.label} widget`}
                    className={css({
                      padding: "4px 10px!",
                      height: "auto!",
                      fontSize: "xs!",
                      flexShrink: 0,
                    })}
                    onClick={() => handleEnableWidget(key)}
                  >
                    <FaPlus style={{ marginRight: "4px" }} />
                    Add
                  </FLPButton>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
