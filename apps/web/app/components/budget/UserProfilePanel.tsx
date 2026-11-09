import * as Dialog from "@radix-ui/react-dialog";
import {
  calculateIrishTakeHome,
  calculateUKEWNITakeHome,
  getCurrentIrishTaxYear,
  getCurrentUKTaxYear,
} from "@repo/common";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useRef, useState } from "react";
import {
  FaBriefcase,
  FaCamera,
  FaCheckCircle,
  FaEnvelope,
  FaExclamationTriangle,
  FaGlobe,
  FaHome,
  FaKey,
  FaLock,
  FaRocket,
  FaTimes,
  FaTrash,
  FaUser,
} from "react-icons/fa";
import { useNavigate } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPCard from "~/components/core/cards/FLPCard";
import TaxDisclaimerButton from "~/components/core/dialogs/TaxDisclaimerButton";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import UserAvatar from "~/components/navigation/UserAvatar";
import { type UserProfile, type UserProfileUpdate, useUserProfile } from "~/hooks/useUserProfile";
import { processImageFile } from "~/utils/avatar";

interface UserProfilePanelProps {
  initialProfile: UserProfile;
  user?: any;
}

const EMPLOYMENT_TYPES = [
  { value: "employed", label: "Employed (PAYE)" },
  { value: "self-employed", label: "Self-Employed" },
  { value: "other", label: "Other / Not employed" },
] as const;

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

  const [activeSection, setActiveSection] = useState<
    "personal" | "employment" | "property" | "overview"
  >("personal");

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
  const [resetConfirmInput, setResetConfirmInput] = useState("");
  const [resettingData, setResettingData] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

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
    if (resetConfirmInput.trim().toUpperCase() !== "RESET") {
      setResetError("Please type RESET to confirm.");
      return;
    }

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
        setResetConfirmInput("");
        navigate("/app/onboarding");
      }, 1500);
    } catch (err: any) {
      setResetError(err?.message || "Failed to reset financial data. Please try again.");
    } finally {
      setResettingData(false);
    }
  };

  const [warningDismissed, setWarningDismissed] = useState(false);

  const calculatedBreakdown = form.annualSalary
    ? calculateNetTakeHome(
        form.annualSalary,
        form.employmentType,
        form.pensionPercent ?? 5,
        form.isSalarySacrifice ?? true,
        form.country || "GB",
      )
    : null;

  const calculatedTakeHome = calculatedBreakdown ? calculatedBreakdown.monthlyTakeHome : null;

  const isTakeHomeOverridden =
    (form.country === "GB" || form.country === "IE") &&
    form.annualSalary !== null &&
    form.annualSalary !== undefined &&
    form.annualSalary > 0 &&
    form.monthlyTakeHome !== null &&
    form.monthlyTakeHome !== undefined &&
    form.monthlyTakeHome !== calculatedTakeHome;

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateProfile(form);
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

  const toggle = (field: keyof typeof form) => {
    setForm((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const getLocale = (curr: string) => {
    switch (curr) {
      case "USD":
        return "en-US";
      case "EUR":
        return "de-DE";
      case "AUD":
        return "en-AU";
      case "CAD":
        return "en-CA";
      case "NZD":
        return "en-NZ";
      case "JPY":
        return "ja-JP";
      case "INR":
        return "en-IN";
      case "ZAR":
        return "en-ZA";
      case "SGD":
        return "en-SG";
      case "CHF":
        return "de-CH";
      default:
        return "en-GB";
    }
  };

  const formCurrency = form.currency || "GBP";

  const formatCurrency = (val: number | null) => {
    if (val === null) return "—";
    return Intl.NumberFormat(getLocale(formCurrency), {
      style: "currency",
      currency: formCurrency,
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div
      className={css({
        maxWidth: "720px",
        margin: "0 auto",
        paddingBottom: "48px",
      })}
    >
      {/* Header */}
      <div className={css({ my: 6 })}>
        <FLPHeading as="h1" color="blue.500" size="xl">
          Your Profile
        </FLPHeading>
        <FLPText color="text.muted" fontSize="sm">
          Configure your financial profile. This data is shared across Budget, Forecast, and
          Mortgage tools.
        </FLPText>
      </div>

      {/* Sections Selector - Responsive: Dropdown for Mobile, Pills for Desktop */}
      <div className={css({ display: { base: "block", md: "none" }, marginBottom: "20px" })}>
        <label
          htmlFor="mobile-section-select"
          className={css({
            display: "block",
            fontSize: "xs",
            fontWeight: "semibold",
            color: "text.muted",
            marginBottom: "8px",
          })}
        >
          Profile settings section
        </label>
        <div className={css({ position: "relative" })}>
          <select
            id="mobile-section-select"
            aria-label="Profile settings section"
            data-testid="mobile-section-select"
            value={activeSection}
            onChange={(e) => setActiveSection(e.target.value as any)}
            className={css({
              width: "100%",
              minHeight: "48px",
              padding: "12px 16px",
              fontSize: "md",
              fontWeight: "semibold",
              borderRadius: "md",
              border: "2px solid",
              borderColor: "primary",
              backgroundColor: "surface",
              color: "text.primary",
              outline: "none",
              cursor: "pointer",
            })}
          >
            {[
              { id: "personal", label: "Personal details" },
              { id: "employment", label: "Employment & tax" },
              { id: "property", label: "Property & mortgage" },
              { id: "overview", label: "How profile is used" },
            ].map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Desktop Sections Menu */}
      <div
        className={css({
          display: { base: "none", md: "flex" },
          gap: "8px",
          flexWrap: "wrap",
          paddingBottom: "8px",
          marginBottom: "20px",
          borderBottom: "1px solid",
          borderColor: "border",
        })}
      >
        {[
          { id: "personal", label: "Personal details", icon: <FaUser size={13} /> },
          { id: "employment", label: "Employment & tax", icon: <FaBriefcase size={13} /> },
          { id: "property", label: "Property & mortgage", icon: <FaHome size={13} /> },
          { id: "overview", label: "How profile is used", icon: <FaGlobe size={13} /> },
        ].map((tab) => {
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={css({
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 14px",
                borderRadius: "lg",
                fontSize: "sm",
                fontWeight: isActive ? "semibold" : "medium",
                border: "1px solid",
                borderColor: isActive ? "primary" : "border",
                backgroundColor: isActive ? "rgba(99, 99, 241, 0.1)" : "surface",
                color: isActive ? "primary" : "text.muted",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
                _hover: {
                  borderColor: "primary",
                  color: "primary",
                },
              })}
              onClick={() => setActiveSection(tab.id as any)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className={css({ display: "flex", flexDirection: "column", gap: "24px" })}>
        {/* Personal Details */}
        {activeSection === "personal" && (
          <>
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
                    onChange={(e) =>
                      setForm((p) => ({ ...p, displayName: e.target.value || null }))
                    }
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
                      setForm((p) => {
                        const updated = {
                          ...p,
                          country: countryCode,
                          currency: matched ? matched.currency : p.currency,
                        };
                        if (p.annualSalary !== null && p.annualSalary !== undefined) {
                          updated.monthlyTakeHome = calculateNetTakeHome(
                            p.annualSalary,
                            p.employmentType,
                            p.pensionPercent ?? 5,
                            p.isSalarySacrifice ?? true,
                            countryCode,
                          ).monthlyTakeHome;
                        }
                        return updated;
                      });
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
          </>
        )}

        {/* Employment & Income */}
        {activeSection === "employment" && (
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
                  backgroundColor: "rgba(16, 185, 129, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "success.500",
                })}
              >
                <FaBriefcase size={14} />
              </div>
              <FLPHeading as="h3" size="md">
                Employment & Income
              </FLPHeading>
            </div>

            <div className={sectionStyle}>
              <div className={fieldGroupStyle}>
                <label className={labelStyle} htmlFor="employment-type">
                  Employment Type
                </label>
                <select
                  className={selectStyle}
                  id="employment-type"
                  value={form.employmentType ?? ""}
                  onChange={(e) => {
                    const type = (e.target.value as UserProfile["employmentType"]) || null;
                    setForm((p) => {
                      const updated = {
                        ...p,
                        employmentType: type,
                      };
                      if (p.annualSalary !== null && p.annualSalary !== undefined) {
                        updated.monthlyTakeHome = calculateNetTakeHome(
                          p.annualSalary,
                          type,
                          p.pensionPercent ?? 5,
                          p.isSalarySacrifice ?? true,
                          p.country || "GB",
                        ).monthlyTakeHome;
                      }
                      return updated;
                    });
                  }}
                >
                  <option value="">Select type...</option>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div
                className={css({ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" })}
              >
                <div className={fieldGroupStyle}>
                  <label className={labelStyle} htmlFor="annual-salary">
                    Annual Salary (gross)
                  </label>
                  <input
                    className={inputStyle}
                    id="annual-salary"
                    min="0"
                    placeholder="e.g. 45000"
                    type="number"
                    value={form.annualSalary ?? ""}
                    onChange={(e) => {
                      const gross = e.target.value ? Number(e.target.value) : null;
                      setForm((p) => {
                        const updated = {
                          ...p,
                          annualSalary: gross,
                        };
                        if (gross !== null && gross !== undefined) {
                          updated.monthlyTakeHome = calculateNetTakeHome(
                            gross,
                            p.employmentType,
                            p.pensionPercent ?? 5,
                            p.isSalarySacrifice ?? true,
                            p.country || "GB",
                          ).monthlyTakeHome;
                        } else {
                          updated.monthlyTakeHome = null;
                        }
                        return updated;
                      });
                    }}
                  />
                </div>
                <div className={fieldGroupStyle}>
                  <label className={labelStyle} htmlFor="monthly-take-home">
                    Monthly Take-Home (net)
                  </label>
                  <input
                    className={inputStyle}
                    id="monthly-take-home"
                    min="0"
                    placeholder="e.g. 2800"
                    type="number"
                    value={form.monthlyTakeHome ?? ""}
                    onChange={(e) => {
                      setForm((p) => ({
                        ...p,
                        monthlyTakeHome: e.target.value ? Number(e.target.value) : null,
                      }));
                      setWarningDismissed(false);
                    }}
                  />
                  {isTakeHomeOverridden && calculatedTakeHome !== null && (
                    <div className={css({ marginTop: "6px" })}>
                      {warningDismissed ? (
                        <button
                          type="button"
                          className={css({
                            fontSize: "xs",
                            color: "primary",
                            textDecoration: "underline",
                            background: "none",
                            border: "none",
                            padding: 0,
                            cursor: "pointer",
                            fontWeight: "semibold",
                            _hover: { color: "primary.hover" },
                          })}
                          onClick={() => {
                            setForm((p) => ({ ...p, monthlyTakeHome: calculatedTakeHome }));
                            setWarningDismissed(false);
                          }}
                        >
                          Reset to auto-calculated ({formatCurrency(calculatedTakeHome)})
                        </button>
                      ) : (
                        <div
                          className={css({
                            backgroundColor: "rgba(245, 158, 11, 0.05)",
                            border: "1px solid",
                            borderColor: "warning.500",
                            borderRadius: "md",
                            padding: "12px",
                            marginTop: "6px",
                            position: "relative",
                          })}
                        >
                          <button
                            type="button"
                            className={css({
                              position: "absolute",
                              top: "8px",
                              right: "8px",
                              background: "none",
                              border: "none",
                              fontSize: "xs",
                              color: "text.muted",
                              cursor: "pointer",
                              _hover: { color: "text.primary" },
                            })}
                            onClick={() => setWarningDismissed(true)}
                          >
                            Dismiss
                          </button>

                          <div
                            className={css({
                              fontWeight: "semibold",
                              fontSize: "xs",
                              color: "warning.500",
                              marginBottom: "6px",
                            })}
                          >
                            ⚠️ Differs from {form.country === "IE" ? "Irish" : "UK"} tax
                            auto-calculation
                          </div>

                          <div
                            className={css({
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: "6px 12px",
                              fontSize: "xs",
                              color: "text.muted",
                            })}
                          >
                            <div>Gross Salary:</div>
                            <div className={css({ textAlign: "right", color: "text.primary" })}>
                              {formatCurrency(calculatedBreakdown?.gross || 0)}
                            </div>

                            {calculatedBreakdown && calculatedBreakdown.pension > 0 && (
                              <>
                                <div>Pension Contribution ({form.pensionPercent}%):</div>
                                <div className={css({ textAlign: "right", color: "destructive" })}>
                                  -{formatCurrency(calculatedBreakdown.pension)}
                                </div>
                              </>
                            )}

                            {form.country === "GB" && (
                              <>
                                <div>Personal Allowance:</div>
                                <div className={css({ textAlign: "right", color: "text.primary" })}>
                                  {formatCurrency(calculatedBreakdown?.personalAllowance || 0)}
                                </div>
                              </>
                            )}

                            <div>Income Tax:</div>
                            <div className={css({ textAlign: "right", color: "destructive" })}>
                              -{formatCurrency(calculatedBreakdown?.incomeTax || 0)}
                            </div>

                            <div>
                              {form.country === "IE" ? "USC & PRSI:" : "National Insurance:"}
                            </div>
                            <div className={css({ textAlign: "right", color: "destructive" })}>
                              -{formatCurrency(calculatedBreakdown?.ni || 0)}
                            </div>

                            <div
                              className={css({
                                borderTop: "1px solid",
                                borderColor: "border",
                                paddingTop: "4px",
                                fontWeight: "semibold",
                              })}
                            >
                              Auto Net:
                            </div>
                            <div
                              className={css({
                                borderTop: "1px solid",
                                borderColor: "border",
                                paddingTop: "4px",
                                textAlign: "right",
                                color: "success.500",
                                fontWeight: "bold",
                              })}
                            >
                              {formatCurrency(calculatedTakeHome)} /mo
                            </div>
                          </div>

                          <div
                            className={css({
                              marginTop: "8px",
                              display: "flex",
                              justifyContent: "flex-end",
                            })}
                          >
                            <button
                              type="button"
                              className={css({
                                fontSize: "xs",
                                color: "primary",
                                textDecoration: "underline",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                fontWeight: "semibold",
                                _hover: { color: "primary.hover" },
                              })}
                              onClick={() => {
                                setForm((p) => ({ ...p, monthlyTakeHome: calculatedTakeHome }));
                                setWarningDismissed(false);
                              }}
                            >
                              Reset to Auto-calculated
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {form.country === "GB" &&
                (form.employmentType === "employed" || form.employmentType === "self-employed") && (
                  <>
                    <div
                      className={css({
                        borderTop: "1px solid",
                        borderColor: "border",
                        paddingTop: "16px",
                        marginTop: "16px",
                        display: "grid",
                        gridTemplateColumns: {
                          base: "1fr",
                          sm: "repeat(2, 1fr)",
                          md: "repeat(4, 1fr)",
                        },
                        gap: "16px",
                      })}
                    >
                      <div className={fieldGroupStyle}>
                        <label className={labelStyle} htmlFor="pension-percent">
                          Employee Contribution (%)
                        </label>
                        <input
                          className={inputStyle}
                          id="pension-percent"
                          min="0"
                          max="100"
                          placeholder="e.g. 5"
                          type="number"
                          value={form.pensionPercent ?? ""}
                          onChange={(e) => {
                            const pct = e.target.value ? Number(e.target.value) : 0;
                            setForm((p) => {
                              const updated = {
                                ...p,
                                pensionPercent: pct,
                              };
                              if (p.annualSalary !== null && p.annualSalary !== undefined) {
                                updated.monthlyTakeHome = calculateNetTakeHome(
                                  p.annualSalary,
                                  p.employmentType,
                                  pct,
                                  p.isSalarySacrifice ?? true,
                                  p.country || "GB",
                                ).monthlyTakeHome;
                              }
                              return updated;
                            });
                          }}
                        />
                      </div>
                      <div className={fieldGroupStyle}>
                        <label className={labelStyle} htmlFor="pension-employer-percent">
                          Employer Contribution (%)
                        </label>
                        <input
                          className={inputStyle}
                          id="pension-employer-percent"
                          min="0"
                          max="100"
                          placeholder="e.g. 3"
                          type="number"
                          value={form.pensionEmployerPercent ?? ""}
                          onChange={(e) => {
                            const pct = e.target.value ? Number(e.target.value) : 0;
                            setForm((p) => ({
                              ...p,
                              pensionEmployerPercent: pct,
                            }));
                          }}
                        />
                      </div>
                      <div className={fieldGroupStyle}>
                        <span className={labelStyle}>Salary Sacrifice</span>
                        <div
                          className={css({ display: "flex", alignItems: "center", height: "40px" })}
                        >
                          <button
                            className={toggleBtnStyle(form.isSalarySacrifice ?? true)}
                            type="button"
                            onClick={() => {
                              setForm((p) => {
                                const val = !(p.isSalarySacrifice ?? true);
                                const updated = {
                                  ...p,
                                  isSalarySacrifice: val,
                                  ...(val ? {} : { isSalarySacrificeEmployerNi: false }),
                                };
                                if (p.annualSalary !== null && p.annualSalary !== undefined) {
                                  updated.monthlyTakeHome = calculateNetTakeHome(
                                    p.annualSalary,
                                    p.employmentType,
                                    p.pensionPercent ?? 5,
                                    val,
                                    p.country || "GB",
                                  ).monthlyTakeHome;
                                }
                                return updated;
                              });
                            }}
                          >
                            <div style={toggleKnobStyle(form.isSalarySacrifice ?? true)} />
                          </button>
                        </div>
                      </div>
                      <div className={fieldGroupStyle}>
                        <span className={labelStyle}>Pass on Employer NI</span>
                        <div
                          className={css({ display: "flex", alignItems: "center", height: "40px" })}
                        >
                          <button
                            className={toggleBtnStyle(
                              Boolean(
                                (form.isSalarySacrifice ?? true) &&
                                  form.isSalarySacrificeEmployerNi,
                              ),
                            )}
                            disabled={!(form.isSalarySacrifice ?? true)}
                            style={{
                              opacity: (form.isSalarySacrifice ?? true) ? 1 : 0.4,
                              cursor: (form.isSalarySacrifice ?? true) ? "pointer" : "not-allowed",
                            }}
                            type="button"
                            onClick={() => {
                              setForm((p) => ({
                                ...p,
                                isSalarySacrificeEmployerNi: !p.isSalarySacrificeEmployerNi,
                              }));
                            }}
                          >
                            <div
                              style={toggleKnobStyle(
                                Boolean(
                                  (form.isSalarySacrifice ?? true) &&
                                    form.isSalarySacrificeEmployerNi,
                                ),
                              )}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div
                      className={css({
                        fontSize: "xs",
                        color: "text.muted",
                        marginTop: "-8px",
                        display: "flex",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "8px",
                      })}
                    >
                      <span>
                        UK auto-enrolment standard: 5% employee + 3% employer (
                        {(Number(form.pensionPercent) || 0) +
                          (Number(form.pensionEmployerPercent) || 0)}
                        % total).
                      </span>
                      <a
                        href="/app/pension"
                        style={{ color: "#6363f1", textDecoration: "none", fontWeight: 500 }}
                      >
                        Manage pots & forecast retirement in Pension Tracker →
                      </a>
                    </div>
                  </>
                )}

              {/* Tax disclaimer */}
              {form.country === "GB" &&
                (form.employmentType === "employed" || form.employmentType === "self-employed") && (
                  <div className={css({ marginTop: "4px" })}>
                    <TaxDisclaimerButton showShortText />
                  </div>
                )}

              {/* Second Income toggle */}
              <div>
                <div className={toggleRowStyle}>
                  <div>
                    <FLPText fontWeight="medium" fontSize="sm">
                      Second Income / Side Job
                    </FLPText>
                    <FLPText color="text.muted" fontSize="xs">
                      Freelance, part-time, or second employment
                    </FLPText>
                  </div>
                  <button
                    className={toggleBtnStyle(form.hasSecondIncome ?? false)}
                    type="button"
                    onClick={() => toggle("hasSecondIncome")}
                  >
                    <div style={toggleKnobStyle(form.hasSecondIncome ?? false)} />
                  </button>
                </div>
                {form.hasSecondIncome && (
                  <div className={fieldGroupStyle}>
                    <label className={labelStyle} htmlFor="second-income">
                      Monthly Amount
                    </label>
                    <input
                      className={inputStyle}
                      id="second-income"
                      min="0"
                      placeholder="e.g. 500"
                      type="number"
                      value={form.secondIncomeMonthly ?? ""}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          secondIncomeMonthly: e.target.value ? Number(e.target.value) : null,
                        }))
                      }
                    />
                  </div>
                )}
              </div>

              {/* Rental Income toggle */}
              <div>
                <div className={toggleRowStyle}>
                  <div>
                    <FLPText fontWeight="medium" fontSize="sm">
                      Rental Income
                    </FLPText>
                    <FLPText color="text.muted" fontSize="xs">
                      Income from property letting
                    </FLPText>
                  </div>
                  <button
                    className={toggleBtnStyle(form.hasRentalIncome ?? false)}
                    type="button"
                    onClick={() => toggle("hasRentalIncome")}
                  >
                    <div style={toggleKnobStyle(form.hasRentalIncome ?? false)} />
                  </button>
                </div>
                {form.hasRentalIncome && (
                  <div className={fieldGroupStyle}>
                    <label className={labelStyle} htmlFor="rental-income">
                      Monthly Rental Income
                    </label>
                    <input
                      className={inputStyle}
                      id="rental-income"
                      min="0"
                      placeholder="e.g. 1200"
                      type="number"
                      value={form.rentalIncomeMonthly ?? ""}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          rentalIncomeMonthly: e.target.value ? Number(e.target.value) : null,
                        }))
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          </FLPCard>
        )}

        {/* Property */}
        {activeSection === "property" && (
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
                  backgroundColor: "rgba(59, 130, 246, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "blue.500",
                })}
              >
                <FaHome size={14} />
              </div>
              <FLPHeading as="h3" size="md">
                Residential Property & Mortgage
              </FLPHeading>
            </div>

            <div className={toggleRowStyle}>
              <div>
                <FLPText fontWeight="medium" fontSize="sm">
                  I have a mortgage
                </FLPText>
                <FLPText color="text.muted" fontSize="xs">
                  Enables mortgage tracking features and pre-populates tools
                </FLPText>
              </div>
              <button
                className={toggleBtnStyle(form.hasMortgage ?? false)}
                type="button"
                onClick={() => toggle("hasMortgage")}
              >
                <div style={toggleKnobStyle(form.hasMortgage ?? false)} />
              </button>
            </div>

            {form.hasBuyToLet && (
              <div
                className={css({
                  marginTop: "20px",
                  paddingTop: "20px",
                  borderTop: "1px solid",
                  borderColor: "border",
                })}
              >
                <FLPHeading as="h4" size="sm">
                  Buy to Let (BTL) Property
                </FLPHeading>
                <FLPText fontSize="xs" color="text.muted" style={{ marginTop: "4px" }}>
                  <span>Section 24 Tax Notice:</span> Finance costs are not deductible as expenses
                  for individual landlords.
                </FLPText>
                <div style={{ marginTop: "12px" }}>
                  <FLPText fontSize="xs" fontWeight="semibold" color="text.primary">
                    Gross Rental Yield
                  </FLPText>
                  <FLPText fontSize="xs" color="text.muted">
                    {form.buyToLetPropertyValue && form.buyToLetMonthlyRental
                      ? `${(((form.buyToLetMonthlyRental * 12) / form.buyToLetPropertyValue) * 100).toFixed(1)}%`
                      : "—"}
                  </FLPText>
                </div>
              </div>
            )}
          </FLPCard>
        )}

        {/* Summary */}
        {activeSection === "overview" && (
          <FLPCard>
            <div
              className={css({
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "16px",
              })}
            >
              <div
                className={css({
                  width: "36px",
                  height: "36px",
                  borderRadius: "full",
                  backgroundColor: "rgba(168, 85, 247, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "purple.500",
                })}
              >
                <FaGlobe size={14} />
              </div>
              <FLPHeading as="h3" size="md">
                How your profile is used
              </FLPHeading>
            </div>
            <div
              className={css({
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              })}
            >
              {[
                {
                  label: "Tax Calculator",
                  value: formatCurrency(syncedProfile.annualSalary),
                  desc: "Annual salary pre-filled",
                },
                {
                  label: "Budget Income",
                  value: formatCurrency(syncedProfile.monthlyTakeHome),
                  desc: "Take-home pre-filled",
                },
                {
                  label: "Mortgage Tools",
                  value: syncedProfile.hasMortgage ? "Enabled" : "Not set",
                  desc: "Contextual onboarding",
                },
                {
                  label: "Runway Calculator",
                  value: syncedProfile.hasRentalIncome
                    ? "Rental income included"
                    : "Primary income only",
                  desc: "Unemployment planning",
                },
                {
                  label: "Pension Tracker",
                  value: `${syncedProfile.pensionPercent ?? 5}% + ${syncedProfile.pensionEmployerPercent ?? 3}%${
                    syncedProfile.isSalarySacrifice
                      ? syncedProfile.isSalarySacrificeEmployerNi
                        ? " (Salary Sacrifice + Employer NI)"
                        : " (Salary Sacrifice)"
                      : " (Net Pay)"
                  }`,
                  desc: "Pre-fills retirement forecast",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className={css({
                    padding: "12px",
                    borderRadius: "md",
                    backgroundColor: "background",
                    border: "1px solid",
                    borderColor: "border",
                  })}
                >
                  <FLPText
                    fontSize="xs"
                    color="text.muted"
                    fontWeight="semibold"
                    textTransform="uppercase"
                  >
                    {item.label}
                  </FLPText>
                  <FLPText fontSize="sm" fontWeight="bold" style={{ marginTop: "2px" }}>
                    {item.value}
                  </FLPText>
                  <FLPText fontSize="xs" color="text.muted">
                    {item.desc}
                  </FLPText>
                </div>
              ))}
            </div>

            <div
              className={css({
                marginTop: "16px",
                paddingTop: "16px",
                borderTop: "1px solid",
                borderColor: "border",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px",
              })}
            >
              <div>
                <FLPText fontSize="sm" fontWeight="semibold">
                  Personalised Setup & Active Modules
                </FLPText>
                <FLPText fontSize="xs" color="text.muted">
                  Re-take the financial onboarding quiz or re-tailor which modules appear in your
                  navigation and dashboard.
                </FLPText>
              </div>
              <FLPButton
                id="rerun-onboarding-btn"
                data-testid="rerun-onboarding-btn"
                size="sm"
                type="button"
                variant="outline"
                onClick={() => navigate("/app/onboarding")}
              >
                <FaRocket style={{ marginRight: "6px" }} />
                Re-run Setup Wizard
              </FLPButton>
            </div>
          </FLPCard>
        )}

        {/* Save */}
        {error && (
          <FLPText color="destructive" fontSize="sm">
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

        {/* Danger Zone: Reset Financial Data */}
        <FLPCard>
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
                setResetConfirmInput("");
                setResetModalOpen(true);
              }}
            >
              Reset All Financial Data
            </FLPButton>
          </div>
        </FLPCard>
      </div>

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
      <Dialog.Root open={resetModalOpen} onOpenChange={setResetModalOpen}>
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
              maxWidth: "480px",
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
                <FaExclamationTriangle
                  style={{ color: "var(--colors-red-500)", fontSize: "18px" }}
                />
                <Dialog.Title asChild>
                  <FLPHeading as="h2" size="md">
                    Reset All Financial Data
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
              <div style={{ marginBottom: "16px" }}>
                <FLPText fontSize="sm" color="text.muted">
                  Are you absolutely sure? This action is <strong>permanent</strong> and will
                  immediately wipe:
                </FLPText>
                <ul
                  style={{
                    fontSize: "12px",
                    color: "var(--colors-text-muted)",
                    paddingLeft: "18px",
                    marginTop: "8px",
                    marginBottom: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <li>All connected and manual accounts</li>
                  <li>All transaction history and balances</li>
                  <li>All budget entries and recurring rules</li>
                  <li>All income and expense tax records</li>
                  <li>All property, salary, and savings settings</li>
                </ul>
                <FLPText fontSize="xs" color="red.500" fontWeight="semibold">
                  You will start completely fresh from scratch.
                </FLPText>
              </div>
            </Dialog.Description>

            {resetSuccess ? (
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
                All financial data wiped successfully. You have a clean slate!
              </div>
            ) : (
              <div>
                <div className={fieldGroupStyle} style={{ marginBottom: "16px" }}>
                  <label className={labelStyle} htmlFor="confirm-reset-input">
                    Type <strong>RESET</strong> to confirm:
                  </label>
                  <input
                    id="confirm-reset-input"
                    data-testid="confirm-reset-input"
                    type="text"
                    placeholder="RESET"
                    className={inputStyle}
                    value={resetConfirmInput}
                    onChange={(e) => setResetConfirmInput(e.target.value)}
                    autoComplete="off"
                  />
                </div>

                {resetError && (
                  <div
                    data-testid="reset-error"
                    className={css({ color: "red.500", fontSize: "xs", marginBottom: "12px" })}
                  >
                    {resetError}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                  <FLPButton
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setResetModalOpen(false)}
                  >
                    Cancel
                  </FLPButton>
                  <FLPButton
                    type="button"
                    variant="destructive"
                    size="sm"
                    id="confirm-reset-btn"
                    data-testid="confirm-reset-btn"
                    disabled={resetConfirmInput.trim().toUpperCase() !== "RESET" || resettingData}
                    onClick={handleResetFinancialData}
                  >
                    {resettingData ? "Resetting..." : "Permanently Reset Everything"}
                  </FLPButton>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

export default UserProfilePanel;
