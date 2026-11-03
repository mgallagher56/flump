import { css } from "@repo/ui/styled-system/css";
import { useMemo, useState } from "react";
import {
  FaArrowLeft,
  FaArrowRight,
  FaBuilding,
  FaChartLine,
  FaCheck,
  FaCheckCircle,
  FaCoins,
  FaFileInvoiceDollar,
  FaPiggyBank,
  FaRegCircle,
  FaRocket,
  FaShieldAlt,
  FaSlidersH,
  FaWallet,
} from "react-icons/fa";
import {
  type ActionFunctionArgs,
  data,
  type LoaderFunctionArgs,
  redirect,
  useLoaderData,
  useNavigate,
} from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPCard from "~/components/core/cards/FLPCard";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import HomeLogo from "~/components/navigation/HomeLogo";
import type { UserProfile } from "~/hooks/useUserProfile";
import { DEFAULT_PROFILE, useUserProfile } from "~/hooks/useUserProfile";
import {
  ALL_PAGE_KEYS,
  APP_PAGES,
  type AppPageKey,
  type DashboardWidgetKey,
} from "~/utils/pageConfig";
import { getAuthSession } from "~/utils/utils";

export const loader = async (args: LoaderFunctionArgs) => {
  const { user, accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  const apiUrl = process.env.VITE_API_URL || "http://localhost:4000";

  try {
    const res = await fetch(`${apiUrl}/user-profile`, {
      headers: { Authorization: `Bearer ${accessToken || "mock-session-token"}` },
    });
    const userProfile: UserProfile = res.ok ? await res.json() : DEFAULT_PROFILE;
    return data({ userProfile, user });
  } catch (error) {
    console.error("Onboarding loader error:", error);
    return data({ userProfile: DEFAULT_PROFILE, user });
  }
};

export const action = async (args: ActionFunctionArgs) => {
  const { accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  const apiUrl = process.env.VITE_API_URL || "http://localhost:4000";
  const formData = await args.request.formData();
  const rawEnabledPages = formData.get("enabledPages");
  const enabledPages: AppPageKey[] = rawEnabledPages
    ? JSON.parse(rawEnabledPages as string)
    : ALL_PAGE_KEYS;

  const dashboardWidgets: DashboardWidgetKey[] = ["financialHealth", ...enabledPages];
  const dashboardWidgetOrder: DashboardWidgetKey[] = ["financialHealth", ...enabledPages];

  try {
    await fetch(`${apiUrl}/user-profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken || "mock-session-token"}`,
      },
      body: JSON.stringify({
        enabledPages,
        dashboardWidgets,
        dashboardWidgetOrder,
        onboardingCompleted: true,
      }),
    });
  } catch (err) {
    console.error("Failed to complete onboarding:", err);
  }

  return redirect("/");
};

interface QuestionConfig {
  id: number;
  category: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  associatedPages: AppPageKey[];
  yesLabel: string;
  noLabel: string;
}

const QUESTIONS: QuestionConfig[] = [
  {
    id: 1,
    category: "Everyday Banking & Budgeting",
    title: "Do you want to manage accounts and plan your monthly budget?",
    description:
      "Track your accounts, see your overall net worth, organize spending into categories, and find out your emergency savings runway.",
    icon: <FaWallet size={24} />,
    iconBg: "rgba(99, 99, 241, 0.12)",
    iconColor: "#6363f1",
    associatedPages: ["accounts", "budget"],
    yesLabel: "Yes, include Accounts & Budgeting",
    noLabel: "No, skip for now",
  },
  {
    id: 2,
    category: "Savings & Wealth Growth",
    title: "Do you have savings accounts or investment portfolios?",
    description:
      "Record your interest rates, set regular monthly contributions, and forecast compound interest growth 10+ years into the future.",
    icon: <FaPiggyBank size={24} />,
    iconBg: "rgba(16, 185, 129, 0.12)",
    iconColor: "#10b981",
    associatedPages: ["savings", "forecast"],
    yesLabel: "Yes, track Savings & Forecaster",
    noLabel: "No, not right now",
  },
  {
    id: 3,
    category: "Pension & Retirement",
    title: "Do you contribute to a workplace or personal pension?",
    description:
      "Monitor UK auto-enrolment employer and employee contribution splits, salary sacrifice tax savings, and forecast retirement funds.",
    icon: <FaShieldAlt size={24} />,
    iconBg: "rgba(139, 92, 246, 0.12)",
    iconColor: "#8b5cf6",
    associatedPages: ["pension"],
    yesLabel: "Yes, track Pension Pots",
    noLabel: "No, don't track pensions",
  },
  {
    id: 4,
    category: "Homeownership & Mortgages",
    title: "Do you own a home with a mortgage or plan to buy soon?",
    description:
      "Track amortization schedules, simulate how overpayments shorten your loan term, and compare paying off the mortgage vs. saving.",
    icon: <FaBuilding size={24} />,
    iconBg: "rgba(245, 158, 11, 0.12)",
    iconColor: "#f59e0b",
    associatedPages: ["mortgage"],
    yesLabel: "Yes, add Mortgage Tools",
    noLabel: "No, I rent or don't have a mortgage",
  },
  {
    id: 5,
    category: "Self-Employment & Property Tax",
    title: "Do you earn self-employed income or rent out residential property?",
    description:
      "Keep cash-basis P&L records, upload receipts, and estimate UK Self-Assessment income tax, Class 4 NI, and Section 24 mortgage relief.",
    icon: <FaFileInvoiceDollar size={24} />,
    iconBg: "rgba(59, 130, 246, 0.12)",
    iconColor: "#3b82f6",
    associatedPages: ["tax"],
    yesLabel: "Yes, include Tax Tracker",
    noLabel: "No, I am standard PAYE employed only",
  },
];

export default function OnboardingRoute() {
  const { userProfile, user } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { updateProfile } = useUserProfile();

  // Mode: "welcome" | "quiz" | "manual"
  const [mode, setMode] = useState<"welcome" | "quiz" | "manual">("welcome");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [cameFromQuiz, setCameFromQuiz] = useState(false);

  // Map of enabled pages
  const initialPages = useMemo<AppPageKey[]>(() => {
    if (userProfile?.enabledPages && userProfile.enabledPages.length > 0) {
      return userProfile.enabledPages as AppPageKey[];
    }
    return ["accounts", "budget", "savings", "pension"];
  }, [userProfile?.enabledPages]);

  const [selectedPages, setSelectedPages] = useState<AppPageKey[]>(initialPages);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Questionnaire navigation
  const handleAnswerQuestion = (enable: boolean) => {
    const q = QUESTIONS[currentQuestionIndex];
    setSelectedPages((prev) => {
      let next = [...prev];
      if (enable) {
        q.associatedPages.forEach((p) => {
          if (!next.includes(p)) next.push(p);
        });
      } else {
        next = next.filter((p) => !q.associatedPages.includes(p));
      }
      return next;
    });

    if (currentQuestionIndex < QUESTIONS.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      setCameFromQuiz(true);
      setMode("manual");
    }
  };

  const handleTogglePage = (key: AppPageKey) => {
    setSelectedPages((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key],
    );
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    const pagesToSave = selectedPages.length > 0 ? selectedPages : ["accounts", "budget"];
    const dashboardWidgets: DashboardWidgetKey[] = [
      "financialHealth",
      ...(pagesToSave as DashboardWidgetKey[]),
    ];
    const dashboardWidgetOrder: DashboardWidgetKey[] = [
      "financialHealth",
      ...(pagesToSave as DashboardWidgetKey[]),
    ];

    try {
      await updateProfile({
        enabledPages: pagesToSave,
        dashboardWidgets,
        dashboardWidgetOrder,
        onboardingCompleted: true,
      });
      navigate("/");
    } catch (err) {
      console.error("Error saving onboarding settings:", err);
      // Fallback: reload to root
      window.location.href = "/";
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQ = QUESTIONS[currentQuestionIndex];

  return (
    <div
      className={css({
        minHeight: "100vh",
        backgroundColor: "background",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: { base: "20px 16px", sm: "32px 24px", md: "48px 32px" },
      })}
    >
      <div
        className={css({
          width: "100%",
          maxWidth: "680px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        })}
      >
        {/* Brand & Progress Bar */}
        <div
          className={css({
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: "12px",
            borderBottom: "1px solid",
            borderColor: "border",
          })}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <HomeLogo />
            <div>
              <FLPHeading as="h3" size="sm" color="blue.500">
                Flump Onboarding
              </FLPHeading>
              <FLPText fontSize="xs" color="text.muted">
                Personalise your financial universe
              </FLPText>
            </div>
          </div>

          {mode === "quiz" && (
            <button
              type="button"
              className={css({
                fontSize: "xs",
                color: "text.muted",
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "6px 10px",
                borderRadius: "md",
                _hover: { color: "primary", backgroundColor: "rgba(99, 99, 241, 0.08)" },
              })}
              onClick={() => {
                setCameFromQuiz(true);
                setMode("manual");
              }}
            >
              <FaSlidersH size={11} /> Skip to manual picker
            </button>
          )}
        </div>

        {/* MODE: WELCOME SCREEN */}
        {mode === "welcome" && (
          <FLPCard
            className={css({
              padding: { base: "28px 20px", sm: "40px 32px" },
              borderRadius: "2xl",
              border: "1px solid",
              borderColor: "border",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
              boxShadow: "sm",
            })}
          >
            <div style={{ textAlign: "center" }}>
              <div
                className={css({
                  width: "64px",
                  height: "64px",
                  borderRadius: "full",
                  backgroundColor: "rgba(99, 99, 241, 0.12)",
                  color: "primary",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "28px",
                  margin: "0 auto 16px",
                })}
              >
                <FaRocket />
              </div>
              <FLPHeading as="h1" size="xl" color="blue.500">
                Welcome to Flump{user?.name ? `, ${user.name}` : ""}
              </FLPHeading>
              <FLPText
                color="text.muted"
                fontSize="sm"
                style={{ marginTop: "8px", maxWidth: "480px", marginInline: "auto" }}
              >
                Flump adapts to your individual financial situation. Take a 30-second quiz to pick
                the right tools for you, or select your preferred sections manually.
              </FLPText>
            </div>

            <div
              className={css({
                display: "grid",
                gridTemplateColumns: { base: "1fr", sm: "1fr 1fr" },
                gap: "16px",
                marginTop: "8px",
              })}
            >
              <button
                type="button"
                className={css({
                  padding: "24px 20px",
                  borderRadius: "xl",
                  border: "2px solid",
                  borderColor: "primary",
                  backgroundColor: "rgba(99, 99, 241, 0.04)",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  transition: "all 0.2s ease",
                  _hover: {
                    transform: "translateY(-2px)",
                    boxShadow: "md",
                    backgroundColor: "rgba(99, 99, 241, 0.08)",
                  },
                })}
                onClick={() => {
                  setCurrentQuestionIndex(0);
                  setCameFromQuiz(true);
                  setMode("quiz");
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <span
                    className={css({
                      fontSize: "xs",
                      fontWeight: "bold",
                      color: "primary",
                      backgroundColor: "rgba(99, 99, 241, 0.15)",
                      padding: "2px 8px",
                      borderRadius: "full",
                    })}
                  >
                    Recommended
                  </span>
                  <FaArrowRight size={14} color="var(--colors-primary)" />
                </div>
                <div>
                  <FLPHeading as="h3" size="sm">
                    Answer 5 Quick Questions
                  </FLPHeading>
                  <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "4px" }}>
                    We'll tailor your sections based on your housing, pension, and employment setup.
                  </FLPText>
                </div>
              </button>

              <button
                type="button"
                className={css({
                  padding: "24px 20px",
                  borderRadius: "xl",
                  border: "1px solid",
                  borderColor: "border",
                  backgroundColor: "surface",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  transition: "all 0.2s ease",
                  _hover: {
                    borderColor: "primary",
                    transform: "translateY(-2px)",
                    boxShadow: "sm",
                  },
                })}
                onClick={() => {
                  setCameFromQuiz(false);
                  setMode("manual");
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <span
                    className={css({
                      fontSize: "xs",
                      fontWeight: "medium",
                      color: "text.muted",
                    })}
                  >
                    Direct Setup
                  </span>
                  <FaSlidersH size={14} color="var(--colors-text-muted)" />
                </div>
                <div>
                  <FLPHeading as="h3" size="sm">
                    Choose Modules Manually
                  </FLPHeading>
                  <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "4px" }}>
                    Browse all available financial modules and toggle each one on or off yourself.
                  </FLPText>
                </div>
              </button>
            </div>
          </FLPCard>
        )}

        {/* MODE: 5-QUESTION QUESTIONNAIRE */}
        {mode === "quiz" && (
          <FLPCard
            className={css({
              padding: { base: "24px 18px", sm: "36px 32px" },
              borderRadius: "2xl",
              border: "1px solid",
              borderColor: "border",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
              boxShadow: "sm",
            })}
          >
            {/* Progress Bar */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <span
                  className={css({
                    fontSize: "xs",
                    fontWeight: "bold",
                    color: "primary",
                    textTransform: "uppercase",
                    letterSpacing: "wider",
                  })}
                >
                  Question {currentQuestionIndex + 1} of {QUESTIONS.length}
                </span>
                <span className={css({ fontSize: "xs", color: "text.muted" })}>
                  {currentQ.category}
                </span>
              </div>
              <div
                className={css({
                  height: "6px",
                  width: "100%",
                  backgroundColor: "secondary",
                  borderRadius: "full",
                  overflow: "hidden",
                })}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${((currentQuestionIndex + 1) / QUESTIONS.length) * 100}%`,
                    backgroundColor: "#6363f1",
                    borderRadius: "full",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>

            {/* Question Content */}
            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
              <div
                className={css({
                  width: "52px",
                  height: "52px",
                  borderRadius: "xl",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                })}
                style={{ backgroundColor: currentQ.iconBg, color: currentQ.iconColor }}
              >
                {currentQ.icon}
              </div>
              <div>
                <FLPHeading as="h2" size="md" color="text.primary">
                  {currentQ.title}
                </FLPHeading>
                <FLPText
                  color="text.muted"
                  fontSize="sm"
                  style={{ marginTop: "6px", lineHeight: "1.6" }}
                >
                  {currentQ.description}
                </FLPText>
              </div>
            </div>

            {/* Answer Options */}
            <div
              className={css({
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                marginTop: "12px",
              })}
            >
              <button
                type="button"
                className={css({
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  borderRadius: "xl",
                  border: "2px solid",
                  borderColor: "primary",
                  backgroundColor: "rgba(99, 99, 241, 0.05)",
                  color: "primary",
                  fontSize: "sm",
                  fontWeight: "bold",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  _hover: {
                    backgroundColor: "rgba(99, 99, 241, 0.12)",
                    transform: "translateX(2px)",
                  },
                })}
                onClick={() => handleAnswerQuestion(true)}
              >
                <span>{currentQ.yesLabel}</span>
                <FaCheck />
              </button>

              <button
                type="button"
                className={css({
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  borderRadius: "xl",
                  border: "1px solid",
                  borderColor: "border",
                  backgroundColor: "surface",
                  color: "text.muted",
                  fontSize: "sm",
                  fontWeight: "medium",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  _hover: {
                    borderColor: "primary",
                    color: "text.primary",
                    transform: "translateX(2px)",
                  },
                })}
                onClick={() => handleAnswerQuestion(false)}
              >
                <span>{currentQ.noLabel}</span>
                <FaArrowRight size={12} />
              </button>
            </div>

            {/* Bottom Actions */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "12px",
                borderTop: "1px solid var(--colors-border)",
              }}
            >
              <FLPButton
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (currentQuestionIndex > 0) {
                    setCurrentQuestionIndex((prev) => prev - 1);
                  } else {
                    setMode("welcome");
                  }
                }}
              >
                <FaArrowLeft style={{ marginRight: "6px" }} /> Back
              </FLPButton>

              <FLPButton
                size="sm"
                variant="outline"
                onClick={() => {
                  setCameFromQuiz(true);
                  setMode("manual");
                }}
              >
                Skip to Review <FaArrowRight style={{ marginLeft: "6px" }} />
              </FLPButton>
            </div>
          </FLPCard>
        )}

        {/* MODE: MANUAL MODULE SELECTION & REVIEW */}
        {mode === "manual" && (
          <FLPCard
            className={css({
              padding: { base: "24px 18px", sm: "36px 32px" },
              borderRadius: "2xl",
              border: "1px solid",
              borderColor: "border",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
              boxShadow: "sm",
            })}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <FLPHeading as="h2" size="lg" color="blue.500">
                  Select Your Active Modules
                </FLPHeading>
                <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "4px" }}>
                  Choose which financial sections to enable. You can change these anytime in
                  Profile.
                </FLPText>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className={css({
                    fontSize: "xs",
                    color: "primary",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: "semibold",
                    _hover: { textDecoration: "underline" },
                  })}
                  onClick={() => setSelectedPages([...ALL_PAGE_KEYS])}
                >
                  Select All
                </button>
                <span style={{ color: "var(--colors-border)" }}>•</span>
                <button
                  type="button"
                  className={css({
                    fontSize: "xs",
                    color: "text.muted",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    _hover: { color: "primary", textDecoration: "underline" },
                  })}
                  onClick={() => setSelectedPages(["accounts", "budget", "savings"])}
                >
                  Essentials Only
                </button>
              </div>
            </div>

            {/* List of Modules */}
            <div className={css({ display: "flex", flexDirection: "column", gap: "10px" })}>
              {ALL_PAGE_KEYS.map((key) => {
                const config = APP_PAGES[key];
                const isChecked = selectedPages.includes(key);

                return (
                  <button
                    type="button"
                    key={key}
                    className={css({
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      textAlign: "left",
                      fontFamily: "inherit",
                      padding: "14px 16px",
                      borderRadius: "xl",
                      border: "1px solid",
                      borderColor: isChecked ? "primary" : "border",
                      backgroundColor: isChecked ? "rgba(99, 99, 241, 0.04)" : "surface",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      _hover: {
                        borderColor: "primary",
                      },
                    })}
                    onClick={() => handleTogglePage(key)}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}
                    >
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "lg",
                          backgroundColor: `${config.badgeColor}20`,
                          color: config.badgeColor,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {key === "accounts" && <FaWallet size={16} />}
                        {key === "budget" && <FaCoins size={16} />}
                        {key === "savings" && <FaPiggyBank size={16} />}
                        {key === "pension" && <FaShieldAlt size={16} />}
                        {key === "mortgage" && <FaBuilding size={16} />}
                        {key === "forecast" && <FaChartLine size={16} />}
                        {key === "tax" && <FaFileInvoiceDollar size={16} />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <FLPHeading as="h4" size="xs">
                            {config.label}
                          </FLPHeading>
                          <span
                            className={css({
                              fontSize: "10px",
                              fontWeight: "bold",
                              textTransform: "uppercase",
                              padding: "1px 6px",
                              borderRadius: "full",
                              backgroundColor: "secondary",
                              color: "text.muted",
                            })}
                          >
                            {config.category}
                          </span>
                        </div>
                        <FLPText
                          color="text.muted"
                          fontSize="xs"
                          style={{
                            marginTop: "2px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {config.description}
                        </FLPText>
                      </div>
                    </div>

                    <div style={{ marginLeft: "12px", flexShrink: 0 }}>
                      {isChecked ? (
                        <FaCheckCircle style={{ color: "#10b981", fontSize: "20px" }} />
                      ) : (
                        <FaRegCircle
                          style={{ color: "var(--colors-text-muted)", fontSize: "20px" }}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Note on Dynamic Activation */}
            <div
              className={css({
                padding: "12px 16px",
                borderRadius: "lg",
                backgroundColor: "rgba(99, 99, 241, 0.05)",
                border: "1px dashed rgba(99, 99, 241, 0.3)",
                fontSize: "xs",
                color: "text.muted",
                lineHeight: "1.5",
              })}
            >
              💡 <strong>Smart Dashboard:</strong> Widgets for your chosen sections will remain
              cleanly hidden until you complete their setup steps on the dashboard, keeping your
              home page tidy.
            </div>

            {/* Bottom Actions */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "12px",
                borderTop: "1px solid var(--colors-border)",
              }}
            >
              <FLPButton
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (cameFromQuiz) {
                    setMode("quiz");
                  } else {
                    setMode("welcome");
                  }
                }}
              >
                <FaArrowLeft style={{ marginRight: "6px" }} />{" "}
                {cameFromQuiz ? "Back to Questions" : "Back to Welcome"}
              </FLPButton>

              <FLPButton
                disabled={isSubmitting || selectedPages.length === 0}
                size="md"
                variant="primary"
                onClick={handleFinish}
              >
                {isSubmitting ? "Personalising..." : "Finish Setup & Launch Dashboard →"}
              </FLPButton>
            </div>
          </FLPCard>
        )}
      </div>
    </div>
  );
}
