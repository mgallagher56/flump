import {
  calculateIrishTakeHome,
  calculateUKEWNITakeHome,
  getCurrentIrishTaxYear,
  getCurrentUKTaxYear,
} from "@flump/finance-engine";
import * as Dialog from "@radix-ui/react-dialog";
import { SegmentedTabs } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useRef, useState } from "react";
import {
  FaBriefcase,
  FaCamera,
  FaCheckCircle,
  FaEnvelope,
  FaExclamationTriangle,
  FaHome,
  FaKey,
  FaLock,
  FaTimes,
  FaTrash,
  FaUser,
} from "react-icons/fa";
import { useNavigate } from "react-router";
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

const COUNTRIES = [
  { code: "GB", name: "United Kingdom", currency: "GBP" },
  { code: "US", name: "United States", currency: "USD" },
  { code: "DE", name: "Germany", currency: "EUR" },
  { code: "FR", name: "France", currency: "EUR" },
  { code: "IE", name: "Ireland", currency: "EUR" },
  { code: "ES", name: "Spain", currency: "EUR" },
  { code: "IT", name: "Italy", currency: "EUR" },
  { code: "CA", name: "Canada", currency: "CAD" },
  { code: "AU", name: "Australia", currency: "AUD" },
  { code: "NZ", name: "New Zealand", currency: "NZD" },
  { code: "JP", name: "Japan", currency: "JPY" },
  { code: "IN", name: "India", currency: "INR" },
  { code: "ZA", name: "South Africa", currency: "ZAR" },
  { code: "SG", name: "Singapore", currency: "SGD" },
  { code: "CH", name: "Switzerland", currency: "CHF" },
] as const;

const CURRENCIES = [
  "GBP",
  "USD",
  "EUR",
  "AUD",
  "CAD",
  "NZD",
  "JPY",
  "INR",
  "ZAR",
  "SGD",
  "CHF",
] as const;

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

export interface TaxBreakdown {
  gross: number;
  pension: number;
  personalAllowance: number;
  taxableIncome: number;
  incomeTax: number;
  ni: number;
  netAnnual: number;
  monthlyTakeHome: number;
}

/**
 * calculateNetTakeHome — delegates to the canonical taxRules.ts helpers.
 *
 * For UK (GB): uses calculateUKEWNITakeHome (EWNI rates).
 * For Ireland (IE): uses calculateIrishTakeHome (USC + PRSI).
 * For other countries: returns a simple salary / 12 estimate.
 *
 * NOTE: These are estimates only. See TAX_DISCLAIMER in taxRules.ts.
 */
export function calculateNetTakeHome(
  annualSalary: number | null | undefined,
  employmentType: string | null | undefined,
  pensionPercent = 5,
  isSalarySacrifice = true,
  country = "GB",
): TaxBreakdown {
  const defaultResult: TaxBreakdown = {
    gross: annualSalary || 0,
    pension: 0,
    personalAllowance: 0,
    taxableIncome: 0,
    incomeTax: 0,
    ni: 0,
    netAnnual: annualSalary || 0,
    monthlyTakeHome: annualSalary ? Math.round(annualSalary / 12) : 0,
  };

  if (!annualSalary || annualSalary <= 0) return defaultResult;

  const empType =
    employmentType === "employed" || employmentType === "self-employed" ? employmentType : null;

  if (country === "GB") {
    const result = calculateUKEWNITakeHome(
      annualSalary,
      empType,
      pensionPercent,
      isSalarySacrifice,
      getCurrentUKTaxYear(),
    );
    return {
      gross: result.gross,
      pension: result.pension,
      personalAllowance: result.personalAllowance,
      taxableIncome: result.taxableIncome,
      incomeTax: result.incomeTax,
      ni: result.ni,
      netAnnual: result.netAnnual,
      monthlyTakeHome: result.monthlyTakeHome,
    };
  }

  if (country === "IE") {
    const result = calculateIrishTakeHome(annualSalary, getCurrentIrishTaxYear(), empType);
    return {
      gross: result.gross,
      pension: 0, // Irish pension contribution not modelled in profile panel
      personalAllowance: 0,
      taxableIncome: 0,
      incomeTax: result.incomeTax,
      ni: result.usc + result.prsi, // combine USC and PRSI into the ni field
      netAnnual: result.netAnnual,
      monthlyTakeHome: result.monthlyTakeHome,
    };
  }

  // Other countries — simple gross / 12 estimate
  return defaultResult;
}

const UserProfilePanel: FC<UserProfilePanelProps> = ({ initialProfile, user }) => {
  const {
    profile,
    setProfile,
    updateProfile,
    changePassword,
    sendPasswordResetEmail,
    resetFinancialData,
  } = useUserProfile();
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
    displayName: effectiveProfile.displayName,
    firstName:
      effectiveProfile.firstName ?? user?.firstName ?? user?.user_metadata?.first_name ?? null,
    lastName: effectiveProfile.lastName ?? user?.lastName ?? user?.user_metadata?.last_name ?? null,
    avatarUrl: effectiveProfile.avatarUrl,
    country: effectiveProfile.country || "GB",
    currency: effectiveProfile.currency,
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

  // Change Password state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [sendingResetEmail, setSendingResetEmail] = useState(false);

  // Reset Financial Data state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resettingData, setResettingData] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const [activeTab, setActiveTab] = useState<"profile_security" | "ai_connections">(
    "profile_security",
  );

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!newPassword || newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await changePassword(newPassword);
      setPasswordSuccess(res.message || "Password changed successfully!");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setPasswordModalOpen(false);
        setPasswordSuccess(null);
      }, 2000);
    } catch (err: any) {
      setPasswordError(err?.message || "Failed to update password. Please try again.");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSendResetEmail = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);
    setSendingResetEmail(true);
    try {
      const targetEmail = user?.email || profile.email || undefined;
      const res = await sendPasswordResetEmail(targetEmail);
      setPasswordSuccess(res.message || "Password reset email sent to your address!");
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
                  backgroundColor: "rgba(99, 99, 241, 0.12)",
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
                  displayName: form.displayName,
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
              <div className={fieldGroupStyle}>
                <label className={labelStyle} htmlFor="display-name-input">
                  Display Name
                </label>
                <input
                  className={inputStyle}
                  id="display-name-input"
                  data-testid="display-name-input"
                  placeholder="Your display name"
                  type="text"
                  value={form.displayName ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value || null }))}
                />
              </div>
            </div>

            <div
              className={css({
                display: "grid",
                gridTemplateColumns: { base: "1fr", sm: "1fr 1fr" },
                gap: "16px",
              })}
            >
              <div className={fieldGroupStyle}>
                <label className={labelStyle} htmlFor="country">
                  Country
                </label>
                <select
                  className={selectStyle}
                  id="country"
                  value={form.country ?? "GB"}
                  onChange={(e) => {
                    const countryCode = e.target.value;
                    const matched = COUNTRIES.find((c) => c.code === countryCode);
                    setForm((p) => ({
                      ...p,
                      country: countryCode,
                      currency: matched ? matched.currency : p.currency,
                    }));
                  }}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={fieldGroupStyle}>
                <label className={labelStyle} htmlFor="currency">
                  Currency
                </label>
                <select
                  className={selectStyle}
                  id="currency"
                  value={form.currency ?? "GBP"}
                  onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
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
                    backgroundColor: "rgba(99, 99, 241, 0.12)",
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
                        color: "green.500",
                        backgroundColor: "rgba(34, 197, 94, 0.12)",
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
                onClick={() => {
                  setPasswordError(null);
                  setPasswordSuccess(null);
                  setNewPassword("");
                  setConfirmPassword("");
                  setPasswordModalOpen(true);
                }}
              >
                <FaKey style={{ marginRight: "6px" }} />
                Change Password
              </FLPButton>
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
              <div className={css({ display: "flex", gap: "12px", flexWrap: "wrap" })}>
                <FLPButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/app/tax")}
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
                  color: "success.500",
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
              borderColor: "rgba(239, 68, 68, 0.25)",
              backgroundColor: "rgba(239, 68, 68, 0.02)",
              overflow: "hidden",
              "&[open] summary": {
                borderBottom: "1px solid rgba(239, 68, 68, 0.15)",
              },
            })}
          >
            <summary
              className={css({
                padding: "12px 18px",
                cursor: "pointer",
                fontSize: "xs",
                fontWeight: "semibold",
                color: "red.500",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                userSelect: "none",
                _hover: { backgroundColor: "rgba(239, 68, 68, 0.05)" },
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
                  borderLeftColor: "red.500",
                  paddingLeft: "16px",
                })}
              >
                <div>
                  <div
                    className={css({
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      color: "red.500",
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

      {/* Change Password Dialog */}
      <Dialog.Root open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay
            className={css({
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              backdropFilter: "blur(4px)",
              zIndex: 50,
            })}
          />
          <Dialog.Content
            className={css({
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              backgroundColor: "surface",
              border: "1px solid",
              borderColor: "border",
              borderRadius: "lg",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
              padding: "24px",
              width: "92vw",
              maxWidth: "460px",
              zIndex: 51,
              outline: "none",
              color: "text.primary",
            })}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FaLock style={{ color: "var(--colors-blue-500)", fontSize: "16px" }} />
                <Dialog.Title asChild>
                  <FLPHeading as="h2" size="md">
                    Change Password
                  </FLPHeading>
                </Dialog.Title>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close"
                  className={css({
                    border: "none",
                    background: "transparent",
                    color: "text.muted",
                    cursor: "pointer",
                    padding: "4px",
                    borderRadius: "sm",
                    _hover: { color: "text.primary" },
                  })}
                >
                  <FaTimes />
                </button>
              </Dialog.Close>
            </div>

            <Dialog.Description asChild>
              <FLPText color="text.muted" fontSize="xs" style={{ marginBottom: "16px" }}>
                Enter your new password below. It must be at least 8 characters long.
              </FLPText>
            </Dialog.Description>

            {passwordSuccess ? (
              <div
                className={css({
                  padding: "16px",
                  borderRadius: "md",
                  backgroundColor: "rgba(34, 197, 94, 0.12)",
                  color: "green.500",
                  fontSize: "sm",
                  fontWeight: "medium",
                  textAlign: "center",
                })}
              >
                {passwordSuccess}
              </div>
            ) : (
              <form onSubmit={handleChangePassword}>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div className={fieldGroupStyle}>
                    <label className={labelStyle} htmlFor="modal-new-password-input">
                      New Password
                    </label>
                    <input
                      id="modal-new-password-input"
                      data-testid="modal-new-password-input"
                      type="password"
                      placeholder="At least 8 characters"
                      className={inputStyle}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>

                  <div className={fieldGroupStyle}>
                    <label className={labelStyle} htmlFor="modal-confirm-password-input">
                      Confirm New Password
                    </label>
                    <input
                      id="modal-confirm-password-input"
                      data-testid="modal-confirm-password-input"
                      type="password"
                      placeholder="Re-enter new password"
                      className={inputStyle}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>

                  {passwordError && (
                    <div
                      data-testid="password-error"
                      className={css({ color: "red.500", fontSize: "xs" })}
                    >
                      {passwordError}
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "8px",
                      flexWrap: "wrap",
                      gap: "10px",
                    }}
                  >
                    <button
                      type="button"
                      data-testid="send-reset-email-btn"
                      disabled={sendingResetEmail}
                      onClick={handleSendResetEmail}
                      className={css({
                        border: "none",
                        background: "none",
                        color: "primary",
                        fontSize: "xs",
                        textDecoration: "underline",
                        cursor: "pointer",
                        padding: 0,
                      })}
                    >
                      {sendingResetEmail ? "Sending email..." : "Send reset link by email"}
                    </button>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <FLPButton
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPasswordModalOpen(false)}
                      >
                        Cancel
                      </FLPButton>
                      <FLPButton
                        type="submit"
                        variant="primary"
                        size="sm"
                        id="submit-change-password-btn"
                        data-testid="submit-change-password-btn"
                        disabled={changingPassword}
                      >
                        {changingPassword ? "Updating..." : "Update Password"}
                      </FLPButton>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

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
