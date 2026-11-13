import { SegmentedTabs } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useEffect, useRef, useState } from "react";
import {
  FaBriefcase,
  FaCamera,
  FaCheckCircle,
  FaEnvelope,
  FaExclamationTriangle,
  FaHome,
  FaKey,
  FaTrash,
  FaUser,
} from "react-icons/fa";
import { useLocation, useNavigate } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPCard from "~/components/core/cards/FLPCard";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import UserAvatar from "~/components/navigation/UserAvatar";
import { McpConnectionCard } from "~/features/ai-connections/components/McpConnectionCard";
import { ConfirmDialog } from "~/features/feedback/components/ConfirmDialog";
import { type UserProfile, type UserProfileUpdate, useUserProfile } from "~/hooks/useUserProfile";
import { useFinancialBaseline } from "~/state/baseline.store";
import { processImageFile } from "~/utils/avatar";

interface UserProfilePanelProps {
  initialProfile: UserProfile;
  user?: any;
}

const inputStyle = css({
  width: "100%",
  padding: "10px 14px",
  fontSize: "sm",
  borderRadius: "sm",
  border: "1px solid",
  borderColor: "border",
  backgroundColor: "transparent",
  color: "text.primary",
  outline: "none",
  transition: "all 0.2s",
  _focus: {
    borderColor: "primary",
    boxShadow: "0 0 0 1px token(colors.primary)",
  },
});

const selectStyle = css({
  width: "100%",
  padding: "10px 14px",
  fontSize: "sm",
  borderRadius: "sm",
  border: "1px solid",
  borderColor: "border",
  backgroundColor: "surface",
  color: "text.primary",
  outline: "none",
  cursor: "pointer",
  transition: "all 0.2s",
  _focus: {
    borderColor: "primary",
    boxShadow: "0 0 0 1px token(colors.primary)",
  },
});

const MULTIPLE_PLANS = "MULTIPLE";
const formatPlan = (plan: string) =>
  plan === "POSTGRAD" ? "Postgraduate loan" : plan.replace("PLAN_", "Plan ");

const labelStyle = css({
  fontSize: "sm",
  fontWeight: "medium",
  color: "text.muted",
  marginBottom: "6px",
  display: "block",
});

const fieldGroupStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
});

const sectionStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "20px",
});

const dividerStyle = css({
  borderTop: "1px solid",
  borderColor: "border",
  paddingTop: "24px",
});

const toggleRowStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 0",
});

const toggleBtnStyle = (active: boolean) =>
  css({
    width: "48px",
    height: "26px",
    borderRadius: "full",
    backgroundColor: active ? "primary" : "border",
    border: "none",
    cursor: "pointer",
    position: "relative",
    transition: "all 0.2s ease",
    flexShrink: 0,
  });

const toggleKnobStyle = (active: boolean) => ({
  position: "absolute" as const,
  top: "3px",
  left: active ? "24px" : "3px",
  width: "20px",
  height: "20px",
  borderRadius: "50%",
  backgroundColor: "white",
  transition: "left 0.2s ease",
});

/** The settings tab named by `?tab=`, or null for anything unknown. */
export const parseProfileTab = (search: string): "profile_security" | "ai_connections" | null => {
  const tab = new URLSearchParams(search).get("tab");
  return tab === "ai_connections" || tab === "profile_security" ? tab : null;
};

const UserProfilePanel: FC<UserProfilePanelProps> = ({ initialProfile, user }) => {
  const { profile, setProfile, updateProfile, sendPasswordResetEmail, resetFinancialData } =
    useUserProfile();
  const { updateBaseline } = useFinancialBaseline();

  let navigate: (to: string) => void;
  try {
    // biome-ignore lint/correctness/useHookAtTopLevel: fallback when rendered outside Router in unit tests
    navigate = useNavigate();
  } catch {
    navigate = (to: string) => {
      if (typeof window !== "undefined") window.location.href = to;
    };
  }

  const effectiveProfile = profile.id ? profile : initialProfile;

  const [form, setForm] = useState<UserProfileUpdate>({
    firstName:
      effectiveProfile.firstName ?? user?.firstName ?? user?.user_metadata?.first_name ?? null,
    lastName: effectiveProfile.lastName ?? user?.lastName ?? user?.user_metadata?.last_name ?? null,
    avatarUrl: effectiveProfile.avatarUrl,
    country: "GB",
    currency: "GBP",
    taxRegion: effectiveProfile.taxRegion ?? null,
    studentLoanPlans: effectiveProfile.studentLoanPlans ?? null,
    employmentType: effectiveProfile.employmentType,
    annualSalary: effectiveProfile.annualSalary,
    monthlyTakeHome: effectiveProfile.monthlyTakeHome,
    hasSecondIncome: effectiveProfile.hasSecondIncome,
    secondIncomeMonthly: effectiveProfile.secondIncomeMonthly,
    hasRentalIncome: effectiveProfile.hasRentalIncome,
    rentalIncomeMonthly: effectiveProfile.rentalIncomeMonthly,
    hasMortgage: effectiveProfile.hasMortgage,
    mortgageType: effectiveProfile.mortgageType ?? "repayment",
    propertyOwnershipShare: effectiveProfile.propertyOwnershipShare ?? 100.0,
    hasBuyToLet: effectiveProfile.hasBuyToLet ?? false,
    buyToLetCount: effectiveProfile.buyToLetCount ?? 1,
    buyToLetPropertyValue: effectiveProfile.buyToLetPropertyValue ?? null,
    buyToLetMonthlyRental: effectiveProfile.buyToLetMonthlyRental ?? null,
    buyToLetMortgageBalance: effectiveProfile.buyToLetMortgageBalance ?? null,
    buyToLetMortgageRate: effectiveProfile.buyToLetMortgageRate ?? null,
    buyToLetMortgageType: effectiveProfile.buyToLetMortgageType ?? "interest-only",
    pensionPercent: effectiveProfile.pensionPercent ?? 5.0,
    pensionEmployerPercent: effectiveProfile.pensionEmployerPercent ?? 3.0,
    isSalarySacrifice: effectiveProfile.isSalarySacrifice ?? true,
    isSalarySacrificeEmployerNi: effectiveProfile.isSalarySacrificeEmployerNi ?? false,
  });

  // Password reset state
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [sendingResetEmail, setSendingResetEmail] = useState(false);

  // Reset Financial Data state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resettingData, setResettingData] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const [activeTab, setActiveTab] = useState<"profile_security" | "ai_connections">(
    "profile_security",
  );

  // Deep link from the account menu (?tab=ai_connections). Read after mount so SSR markup matches.
  let search = "";
  try {
    // biome-ignore lint/correctness/useHookAtTopLevel: fallback when rendered outside Router in unit tests
    search = useLocation().search;
  } catch {
    search = typeof window !== "undefined" ? window.location.search : "";
  }
  useEffect(() => {
    const tab = parseProfileTab(search);
    if (tab) setActiveTab(tab);
  }, [search]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setImageUploadError(null);
    try {
      const dataUrl = await processImageFile(file, 512);
      setForm((prev) => ({ ...prev, avatarUrl: dataUrl }));
      await updateProfile({ avatarUrl: dataUrl });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setImageUploadError(err?.message || "Failed to process image. Please try again.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = async () => {
    setUploadingImage(true);
    setImageUploadError(null);
    try {
      setForm((prev) => ({ ...prev, avatarUrl: null }));
      await updateProfile({ avatarUrl: null });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setImageUploadError("Failed to remove profile picture.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSendResetEmail = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);
    setSendingResetEmail(true);
    try {
      const res = await sendPasswordResetEmail();
      setPasswordSuccess(res.message || "We'll email you a link to reset your password.");
    } catch (err: any) {
      setPasswordError(err?.message || "Failed to send reset email. Please try again.");
    } finally {
      setSendingResetEmail(false);
    }
  };

  const handleResetFinancialData = async () => {
    setResettingData(true);
    setResetError(null);
    try {
      await resetFinancialData();
      setResetSuccess(true);
      setForm((prev) => ({
        ...prev,
        annualSalary: null,
        monthlyTakeHome: null,
        hasSecondIncome: false,
        secondIncomeMonthly: null,
        hasRentalIncome: false,
        rentalIncomeMonthly: null,
        hasMortgage: false,
        propertyOwnershipShare: 100.0,
        hasBuyToLet: false,
        buyToLetCount: 1,
        buyToLetPropertyValue: null,
        buyToLetMonthlyRental: null,
        buyToLetMortgageBalance: null,
        buyToLetMortgageRate: null,
      }));
      setTimeout(() => {
        setResetModalOpen(false);
        setResetSuccess(false);
        navigate("/app/onboarding");
      }, 1500);
    } catch (err: any) {
      setResetError(err?.message || "Failed to reset financial data. Please try again.");
    } finally {
      setResettingData(false);
    }
  };

  // Self Assessment is an opt-in module (E16 D3-B): a page, nav entry and dashboard widget.
  const selfAssessmentOn = (profile.enabledPages ?? []).includes("tax");
  const [moduleSaving, setModuleSaving] = useState(false);
  const handleToggleSelfAssessment = async (on: boolean) => {
    const withTax = (list: string[] | undefined) => {
      const base = (list ?? []).filter((k) => k !== "tax");
      return on ? [...base, "tax"] : base;
    };
    setModuleSaving(true);
    try {
      await updateProfile({
        enabledPages: withTax(profile.enabledPages),
        dashboardWidgets: withTax(profile.dashboardWidgets),
        dashboardWidgetOrder: withTax(profile.dashboardWidgetOrder),
      });
    } finally {
      setModuleSaving(false);
    }
  };

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateProfile(form);
      if (form.annualSalary !== undefined || form.propertyOwnershipShare !== undefined) {
        updateBaseline({
          annualGrossSalary:
            form.annualSalary !== undefined && form.annualSalary !== null
              ? Number(form.annualSalary)
              : undefined,
          propertyOwnershipSharePct:
            form.propertyOwnershipShare !== undefined && form.propertyOwnershipShare !== null
              ? Number(form.propertyOwnershipShare)
              : undefined,
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Sync form back to profile on first load if profile atom is populated
  const syncedProfile = profile.id ? profile : initialProfile;

  return (
    <div
      className={css({
        maxWidth: "720px",
        margin: "0 auto",
        paddingBottom: "48px",
      })}
    >
      {/* Header */}
      <div style={{ marginTop: "16px", marginBottom: "8px" }}>
        <FLPHeading as="h1" color="text.primary" size="2xl">
          Your Profile
        </FLPHeading>
        <FLPText color="text.muted" fontSize="sm">
          Manage your personal details, avatar, security settings, and AI connections.
        </FLPText>
      </div>

      <div style={{ marginTop: "16px", marginBottom: "24px" }}>
        <SegmentedTabs
          aria-label="Profile navigation tabs"
          items={[
            { value: "profile_security", label: "Profile & Security" },
            { value: "ai_connections", label: "AI & MCP Access" },
          ]}
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as "profile_security" | "ai_connections")}
        />
      </div>

      {activeTab === "profile_security" ? (
        <div className={css({ display: "flex", flexDirection: "column", gap: "24px" })}>
          {/* Personal Details */}
          <FLPCard>
            <div
              className={css({
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "20px",
              })}
            >
              <div
                className={css({
                  width: "36px",
                  height: "36px",
                  borderRadius: "full",
                  backgroundColor: "color-mix(in srgb, var(--colors-primary) 12%, transparent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "primary",
                })}
              >
                <FaUser size={14} />
              </div>
              <FLPHeading as="h3" size="md">
                Personal Details
              </FLPHeading>
            </div>

            {/* Profile Picture & Thumbnail Section */}
            <div
              className={css({
                display: "flex",
                alignItems: "center",
                gap: "20px",
                padding: "16px",
                borderRadius: "md",
                backgroundColor: "surface.muted",
                border: "1px solid",
                borderColor: "border",
                marginBottom: "24px",
                flexWrap: { base: "wrap", sm: "nowrap" },
              })}
            >
              <UserAvatar
                bordered
                profile={{
                  ...effectiveProfile,
                  firstName: form.firstName,
                  lastName: form.lastName,
                  avatarUrl: form.avatarUrl,
                }}
                size={72}
                user={user}
              />
              <div
                className={css({
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  flex: 1,
                })}
              >
                <div
                  className={css({
                    fontWeight: "semibold",
                    fontSize: "sm",
                    color: "text.primary",
                  })}
                >
                  Profile Picture & Thumbnail
                </div>
                <div className={css({ fontSize: "xs", color: "text.muted" })}>
                  {form.avatarUrl
                    ? "Your custom profile picture is active and used as your thumbnail."
                    : "Your initials are currently used as your thumbnail. Upload an image to personalise your profile picture."}
                </div>
                <div
                  className={css({
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginTop: "6px",
                    flexWrap: "wrap",
                  })}
                >
                  <input
                    ref={fileInputRef}
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    aria-label="Upload profile picture"
                    data-testid="profile-picture-input"
                    id="profile-picture-input"
                    style={{ display: "none" }}
                    type="file"
                    onChange={handleImageUpload}
                  />
                  <FLPButton
                    data-testid="upload-picture-button"
                    disabled={uploadingImage}
                    id="upload-picture-button"
                    size="sm"
                    variant="primary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FaCamera style={{ marginRight: "6px" }} />
                    {uploadingImage
                      ? "Processing..."
                      : form.avatarUrl
                        ? "Change Picture"
                        : "Upload Picture"}
                  </FLPButton>
                  {form.avatarUrl && (
                    <FLPButton
                      data-testid="remove-picture-button"
                      disabled={uploadingImage}
                      id="remove-picture-button"
                      size="sm"
                      variant="outline"
                      onClick={handleRemoveImage}
                    >
                      <FaTrash style={{ marginRight: "6px" }} />
                      Remove
                    </FLPButton>
                  )}
                </div>
                {imageUploadError && (
                  <div
                    className={css({ color: "error", fontSize: "xs", marginTop: "4px" })}
                    data-testid="profile-upload-error"
                  >
                    {imageUploadError}
                  </div>
                )}
              </div>
            </div>

            {/* Names and Profile Fields */}
            <div
              className={css({
                display: "grid",
                gridTemplateColumns: { base: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
                gap: "16px",
                marginBottom: "16px",
              })}
            >
              <div className={fieldGroupStyle}>
                <label className={labelStyle} htmlFor="first-name-input">
                  First Name
                </label>
                <input
                  className={inputStyle}
                  id="first-name-input"
                  data-testid="first-name-input"
                  placeholder="First name"
                  type="text"
                  value={form.firstName ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value || null }))}
                />
              </div>
              <div className={fieldGroupStyle}>
                <label className={labelStyle} htmlFor="last-name-input">
                  Last Name
                </label>
                <input
                  className={inputStyle}
                  id="last-name-input"
                  data-testid="last-name-input"
                  placeholder="Last name"
                  type="text"
                  value={form.lastName ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value || null }))}
                />
              </div>
            </div>
          </FLPCard>

          {/* Optional modules */}
          <FLPCard>
            <label
              className={css({
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                cursor: "pointer",
              })}
              htmlFor="self-assessment-module-toggle"
            >
              <input
                checked={selfAssessmentOn}
                data-testid="self-assessment-module-toggle"
                disabled={moduleSaving}
                id="self-assessment-module-toggle"
                onChange={(e) => handleToggleSelfAssessment(e.target.checked)}
                type="checkbox"
              />
              <span>
                <FLPText color="text.primary" fontSize="sm" fontWeight="semibold">
                  Self Assessment module
                </FLPText>
                <FLPText color="text.muted" fontSize="xs">
                  Income and expense records by tax year, for self-employed or rental income. Adds
                  Tax to your menu and dashboard.
                </FLPText>
              </span>
            </label>
          </FLPCard>

          {/* Email & Account Security Card */}
          <FLPCard>
            <div
              className={css({
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "16px",
              })}
            >
              <div className={css({ display: "flex", alignItems: "center", gap: "12px" })}>
                <div
                  className={css({
                    width: "40px",
                    height: "40px",
                    borderRadius: "full",
                    backgroundColor: "color-mix(in srgb, var(--colors-primary) 12%, transparent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "primary",
                    flexShrink: 0,
                  })}
                >
                  <FaEnvelope size={16} />
                </div>
                <div>
                  <div
                    className={css({ fontSize: "xs", color: "text.muted", fontWeight: "medium" })}
                  >
                    Account Email
                  </div>
                  <div
                    id="user-email-display"
                    data-testid="user-email-display"
                    className={css({
                      fontSize: "sm",
                      fontWeight: "bold",
                      color: "text.primary",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                    })}
                  >
                    <span>{user?.email || profile.email || "dev@flump.com"}</span>
                    <span
                      className={css({
                        fontSize: "xs",
                        color: "status.positive.text",
                        backgroundColor:
                          "color-mix(in srgb, var(--colors-chart-wealth) 12%, transparent)",
                        padding: "2px 8px",
                        borderRadius: "full",
                        fontWeight: "medium",
                      })}
                    >
                      Verified
                    </span>
                  </div>
                </div>
              </div>

              <FLPButton
                type="button"
                variant="outline"
                size="sm"
                id="change-password-trigger"
                data-testid="change-password-trigger"
                disabled={sendingResetEmail}
                onClick={handleSendResetEmail}
              >
                <FaKey style={{ marginRight: "6px" }} />
                {sendingResetEmail ? "Sending email..." : "Change Password"}
              </FLPButton>
              {passwordSuccess ? (
                <p
                  role="status"
                  id="password-reset-status"
                  data-testid="password-reset-status"
                  className={css({ fontSize: "sm", color: "status.positive.text", width: "100%" })}
                >
                  {passwordSuccess}
                </p>
              ) : null}
              {passwordError ? (
                <p
                  role="alert"
                  id="password-reset-error"
                  data-testid="password-reset-error"
                  className={css({ fontSize: "sm", color: "status.danger.text", width: "100%" })}
                >
                  {passwordError}
                </p>
              ) : null}
            </div>
          </FLPCard>

          {/* Dedicated Financial Tool Locations Notice */}
          <FLPCard>
            <div className={css({ display: "flex", flexDirection: "column", gap: "14px" })}>
              <div>
                <FLPHeading as="h4" size="sm">
                  Employment, Tax & Property Settings
                </FLPHeading>
                <FLPText fontSize="xs" color="text.muted" style={{ marginTop: "4px" }}>
                  To keep configurations close to their financial context, your salary, tax code,
                  and pension rates are configured in Tax & Pension, while your property values and
                  mortgage parameters live in Mortgage Tracker.
                </FLPText>
              </div>
              {/* E23 D06/D-4-C: region and student loan for users who onboarded before they were asked */}
              <div
                className={css({
                  display: "grid",
                  gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
                  gap: "16px",
                })}
              >
                <div className={fieldGroupStyle}>
                  <label className={labelStyle} htmlFor="tax-region-select">
                    Where do you pay tax?
                  </label>
                  <select
                    className={selectStyle}
                    id="tax-region-select"
                    data-testid="tax-region-select"
                    aria-describedby="tax-region-help"
                    value={form.taxRegion ?? ""}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        taxRegion: (e.target.value || null) as UserProfileUpdate["taxRegion"],
                      }))
                    }
                  >
                    <option value="">
                      Not set (England, Wales and Northern Ireland rates assumed)
                    </option>
                    <option value="ENGLAND">England</option>
                    <option value="WALES">Wales</option>
                    <option value="SCOTLAND">Scotland</option>
                    <option value="NORTHERN_IRELAND">Northern Ireland</option>
                  </select>
                  <FLPText id="tax-region-help" fontSize="xs" color="text.muted">
                    Scotland has its own income tax rates, so this changes your take-home pay.
                  </FLPText>
                </div>
                <div className={fieldGroupStyle}>
                  <label className={labelStyle} htmlFor="student-loan-select">
                    Student loan plan
                  </label>
                  <select
                    className={selectStyle}
                    id="student-loan-select"
                    data-testid="student-loan-select"
                    value={
                      form.studentLoanPlans == null
                        ? ""
                        : form.studentLoanPlans.length > 1
                          ? MULTIPLE_PLANS
                          : (form.studentLoanPlans[0] ?? "NONE")
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      // Several stored plans are kept as they are unless the user picks one.
                      if (v === MULTIPLE_PLANS) return;
                      setForm((p) => ({
                        ...p,
                        studentLoanPlans: v === "" ? null : v === "NONE" ? [] : [v],
                      }));
                    }}
                  >
                    <option value="">Not set (no loan assumed)</option>
                    {(form.studentLoanPlans?.length ?? 0) > 1 && (
                      <option value={MULTIPLE_PLANS}>
                        {form.studentLoanPlans?.map(formatPlan).join(" and ")}
                      </option>
                    )}
                    <option value="NONE">None</option>
                    <option value="PLAN_1">Plan 1</option>
                    <option value="PLAN_2">Plan 2</option>
                    <option value="PLAN_4">Plan 4 (Scotland)</option>
                    <option value="PLAN_5">Plan 5</option>
                    <option value="POSTGRAD">Postgraduate loan</option>
                  </select>
                </div>
              </div>
              <div className={css({ display: "flex", gap: "12px", flexWrap: "wrap" })}>
                <FLPButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/app/self-assessment")}
                >
                  <FaBriefcase style={{ marginRight: "6px" }} />
                  Go to Tax & Take-Home
                </FLPButton>
                <FLPButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/app/mortgage")}
                >
                  <FaHome style={{ marginRight: "6px" }} />
                  Go to Mortgage Tracker
                </FLPButton>
              </div>
            </div>
          </FLPCard>

          {/* Save */}
          {error && (
            <FLPText color="status.danger.text" fontSize="sm">
              {error}
            </FLPText>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            {saved && (
              <div
                className={css({
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "status.positive.text",
                  fontSize: "sm",
                })}
              >
                <FaCheckCircle />
                Saved!
              </div>
            )}
            <FLPButton disabled={saving} variant="primary" onClick={handleSave}>
              {saving ? "Saving..." : "Save Profile"}
            </FLPButton>
          </div>

          {/* Danger Zone: Reset Financial Data (Isolated in collapsible disclosure) */}
          <details
            className={css({
              marginTop: "16px",
              borderRadius: "xl",
              border: "1px solid",
              borderColor: "color-mix(in srgb, var(--colors-status-danger-text) 25%, transparent)",
              backgroundColor:
                "color-mix(in srgb, var(--colors-status-danger-text) 2%, transparent)",
              overflow: "hidden",
              "&[open] summary": {
                borderBottom:
                  "1px solid color-mix(in srgb, var(--colors-status-danger-text) 15%, transparent)",
              },
            })}
          >
            <summary
              className={css({
                padding: "12px 18px",
                cursor: "pointer",
                fontSize: "xs",
                fontWeight: "semibold",
                color: "status.danger.text",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                userSelect: "none",
                _hover: {
                  backgroundColor:
                    "color-mix(in srgb, var(--colors-status-danger-text) 5%, transparent)",
                },
              })}
            >
              <FaExclamationTriangle />
              <span>Danger Zone: Reset Financial Data (Click to expand)</span>
            </summary>
            <div style={{ padding: "16px 20px" }}>
              <div
                className={css({
                  display: "flex",
                  flexDirection: { base: "column", sm: "row" },
                  justifyContent: "space-between",
                  alignItems: { base: "flex-start", sm: "center" },
                  gap: "16px",
                  borderLeft: "4px solid",
                  borderLeftColor: "status.danger.text",
                  paddingLeft: "16px",
                })}
              >
                <div>
                  <div
                    className={css({
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      color: "status.danger.text",
                      fontWeight: "semibold",
                      fontSize: "sm",
                      marginBottom: "4px",
                    })}
                  >
                    <FaExclamationTriangle />
                    <span>Danger Zone: Reset Financial Data</span>
                  </div>
                  <FLPText fontSize="xs" color="text.muted">
                    Permanently delete all your accounts, transactions, bank connections, budget
                    entries, and tax records to start completely from scratch.
                  </FLPText>
                </div>
                <FLPButton
                  type="button"
                  variant="destructive"
                  size="sm"
                  id="reset-financial-data-trigger"
                  data-testid="reset-financial-data-trigger"
                  onClick={() => {
                    setResetError(null);
                    setResetSuccess(false);
                    setResetModalOpen(true);
                  }}
                >
                  Reset All Financial Data
                </FLPButton>
              </div>
            </div>
          </details>
        </div>
      ) : (
        <div className={css({ display: "flex", flexDirection: "column", gap: "24px" })}>
          <McpConnectionCard />
        </div>
      )}

      {/* Reset Financial Data Dialog */}
      <ConfirmDialog
        open={resetModalOpen}
        onOpenChange={(open) => {
          setResetModalOpen(open);
          if (!open) setResetError(null);
        }}
        title="Reset all financial data"
        description={
          <div className={css({ display: "flex", flexDirection: "column", gap: "8px" })}>
            <span>
              Are you sure? This is <strong>permanent</strong> and immediately wipes:
            </span>
            <ul className={css({ paddingLeft: "18px", listStyle: "disc" })}>
              <li>All connected and manual accounts</li>
              <li>All transaction history and balances</li>
              <li>All budget entries and recurring rules</li>
              <li>All income and expense tax records</li>
              <li>All property, salary and savings settings</li>
            </ul>
            <span>You will start again from scratch.</span>
            {resetSuccess ? (
              <p role="status" className={css({ color: "status.positive.text" })}>
                All financial data wiped. You have a clean slate.
              </p>
            ) : null}
            {resetError ? (
              <p role="alert" className={css({ color: "status.danger.text" })}>
                {resetError}
              </p>
            ) : null}
          </div>
        }
        confirmLabel="Reset everything"
        tone="danger"
        requireText="RESET"
        pending={resettingData || resetSuccess}
        onConfirm={handleResetFinancialData}
      />
    </div>
  );
};

export default UserProfilePanel;
