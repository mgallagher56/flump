import { css } from "@repo/ui/styled-system/css";
import { type FC, useState } from "react";
import { FaBriefcase, FaCheckCircle, FaGlobe, FaHome, FaUser } from "react-icons/fa";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPCard from "~/components/core/cards/FLPCard";
import TaxDisclaimerButton from "~/components/core/dialogs/TaxDisclaimerButton";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { type UserProfile, type UserProfileUpdate, useUserProfile } from "~/hooks/useUserProfile";
import {
  calculateIrishTakeHome,
  calculateUKEWNITakeHome,
  getCurrentIrishTaxYear,
  getCurrentUKTaxYear,
} from "~/utils/taxRules";

interface UserProfilePanelProps {
  initialProfile: UserProfile;
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

const UserProfilePanel: FC<UserProfilePanelProps> = ({ initialProfile }) => {
  const { profile, setProfile, updateProfile } = useUserProfile();
  const effectiveProfile = profile.id ? profile : initialProfile;

  const [form, setForm] = useState<UserProfileUpdate>({
    displayName: effectiveProfile.displayName,
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
    pensionPercent: effectiveProfile.pensionPercent ?? 5.0,
    isSalarySacrifice: effectiveProfile.isSalarySacrifice ?? true,
  });

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

          <div
            className={css({
              display: "grid",
              gridTemplateColumns: { base: "1fr", md: "1fr 1fr 1fr" },
              gap: "16px",
            })}
          >
            <div className={fieldGroupStyle}>
              <label className={labelStyle} htmlFor="display-name">
                Display Name
              </label>
              <input
                className={inputStyle}
                id="display-name"
                placeholder="Your name"
                type="text"
                value={form.displayName ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value || null }))}
              />
            </div>
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

        {/* Employment & Income */}
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

            <div className={css({ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" })}>
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

                          <div>{form.country === "IE" ? "USC & PRSI:" : "National Insurance:"}</div>
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
                <div
                  className={css({
                    borderTop: "1px solid",
                    borderColor: "border",
                    paddingTop: "16px",
                    marginTop: "16px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                  })}
                >
                  <div className={fieldGroupStyle}>
                    <label className={labelStyle} htmlFor="pension-percent">
                      Pension Contribution (%)
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
                    <span className={labelStyle}>Salary Sacrifice Pension</span>
                    <div className={css({ display: "flex", alignItems: "center", height: "40px" })}>
                      <button
                        className={toggleBtnStyle(form.isSalarySacrifice ?? true)}
                        type="button"
                        onClick={() => {
                          setForm((p) => {
                            const val = !(p.isSalarySacrifice ?? true);
                            const updated = {
                              ...p,
                              isSalarySacrifice: val,
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
                </div>
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

        {/* Property */}
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
              Property
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
        </FLPCard>

        {/* Summary */}
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
        </FLPCard>

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
      </div>
    </div>
  );
};

export default UserProfilePanel;
