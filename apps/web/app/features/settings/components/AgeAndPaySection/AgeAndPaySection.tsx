import {
  contributionMonthlyFromPercent,
  contributionPercentFromMonthly,
  getUkCalendarDate,
} from "@flump/finance-engine";
import {
  ButtonLink,
  Card,
  CurrencyInput,
  controlProps,
  FormField,
  type FormFieldControlState,
  PageSection,
  PercentInput,
  Select,
  Tabs,
  useOptionalToast,
  WholeNumberInput,
} from "@repo/ui";
import { CalendarDays } from "lucide-react";
import { type FC, type FocusEvent, type KeyboardEvent, useRef, useState } from "react";
import { Link, useInRouterContext } from "react-router";
import {
  CONTRIBUTION_UNIT_ITEMS,
  CONTRIBUTION_UNIT_LABEL,
  type ContributionUnit,
  contributionMonthlyHint,
  contributionPercentHint,
  NO_SALARY_FOR_MONTHLY,
  pensionRatesAssumed,
} from "~/features/pension/contribution";
import { fieldGrid, sectionCard, statusText } from "~/features/settings/settings.styles";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { type UserProfile, type UserProfileUpdate, useUserProfile } from "~/hooks/useUserProfile";
import {
  ageAndPayAnchor,
  numericField,
  pensionLinkRow,
  pensionUnitLabel,
  pensionUnitNote,
  pensionUnitRow,
} from "./AgeAndPaySection.styles";

export const AGE_AND_PAY_SECTION_ID = "settings-age-and-pay";
export const AGE_AND_PAY_SAVED_MESSAGE = "Saved";
export const AGE_AND_PAY_SAVE_FAILED =
  "We could not save that change. Nothing has changed. Try again.";
export const EARLIEST_BIRTH_YEAR = 1900;
const PENSION_HREF = "/app/pension";
const PENSION_FIELD_IDS = ["pension-percent-input", "pension-employer-percent-input"];

type EmploymentType = NonNullable<UserProfile["employmentType"]>;
const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "", label: "Not set" },
  { value: "employed", label: "Employed" },
  { value: "self-employed", label: "Self-employed" },
  { value: "other", label: "Other" },
] as const;

/** The year in the UK today, so a birth year is checked against the London calendar. */
export const ukCalendarYear = (now: Date = new Date()): number =>
  Number(getUkCalendarDate(now).slice(0, 4));

/** The year typed, or null for an empty field, or "invalid" for anything else. */
export const parseBirthYear = (text: string, currentYear: number): number | null | "invalid" => {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  if (!/^\d{4}$/.test(trimmed)) return "invalid";
  const year = Number(trimmed);
  return year >= EARLIEST_BIRTH_YEAR && year <= currentYear ? year : "invalid";
};

/** The fields this section edits, as saved. Assumed pension rates read as not set (null). */
interface AgeAndPayValues {
  birthYear: number | null;
  employmentType: EmploymentType | null;
  annualSalary: number | null;
  pensionPercent: number | null;
  pensionEmployerPercent: number | null;
}

const valuesFromProfile = (profile: UserProfile): AgeAndPayValues => {
  const assumed = pensionRatesAssumed(profile);
  return {
    birthYear: profile.birthYear ?? null,
    employmentType: profile.employmentType ?? null,
    annualSalary: profile.annualSalary ?? null,
    pensionPercent: assumed ? null : (profile.pensionPercent ?? null),
    pensionEmployerPercent: assumed ? null : (profile.pensionEmployerPercent ?? null),
  };
};

export interface AgeAndPaySectionProps {
  /** The saved profile: the one source of truth for age, salary and pension rates. */
  profile: UserProfile;
  /** Saves a change. Defaults to the shared profile's `updateProfile`; stories and tests inject one. */
  onSave?: (update: UserProfileUpdate) => Promise<void>;
  /** Today, for the year check and the age line. Tests pin it. */
  now?: Date;
}

/**
 * Your age and pay (UX Batch E): year of birth, salary and pension rates, the figures other pages
 * ask for. Same save model as the rest of the Profile tab: a field saves when it is left or on
 * Enter, only if it changed, with a "Saved" toast; a failed save puts the saved value back and
 * says so on the card. Year of birth only, never a full date (E23 D-3-B), and no State Pension age
 * is worked out here (RD10: the user types their own on Retirement).
 */
export const AgeAndPaySection: FC<AgeAndPaySectionProps> = ({ profile, onSave, now }) => {
  const { updateProfile } = useUserProfile();
  const save = onSave ?? updateProfile;
  const toast = useOptionalToast()?.toast;
  const { formatCurrency: formatPounds } = useFormatCurrency();

  // Outside a router (unit tests, stories) the link is a plain anchor.
  const inRouter = useInRouterContext();

  const currentYear = ukCalendarYear(now);
  const initial = valuesFromProfile(profile);
  const saved = useRef<AgeAndPayValues>(initial);
  const [yearText, setYearText] = useState(initial.birthYear?.toString() ?? "");
  const [employmentType, setEmploymentType] = useState<EmploymentType | null>(
    initial.employmentType,
  );
  const [salary, setSalary] = useState<number | null>(initial.annualSalary);
  const [employee, setEmployee] = useState<number | null>(initial.pensionPercent);
  const [employer, setEmployer] = useState<number | null>(initial.pensionEmployerPercent);
  // The latest typed figures, read on blur: the inputs emit their rounded value just before.
  const draft = useRef({ salary, employee, employer });
  const [yearError, setYearError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  // How the two contributions are entered. Only the percentage is stored: a pounds amount is
  // turned into a percentage of the saved salary as it is typed, and saved like a typed rate.
  const [unitChoice, setUnitChoice] = useState<ContributionUnit>("percent");
  // The pounds as typed, so the field does not jump while typing. Cleared (undefined) to show the
  // pounds worked out from the saved rate again.
  const [typedMonthly, setTypedMonthly] = useState<{
    employee?: number | null;
    employer?: number | null;
  }>({});

  const setField = (patch: Partial<AgeAndPayValues>) => {
    if ("pensionPercent" in patch || "pensionEmployerPercent" in patch) {
      setTypedMonthly((typed) => ({
        employee: "pensionPercent" in patch ? undefined : typed.employee,
        employer: "pensionEmployerPercent" in patch ? undefined : typed.employer,
      }));
    }
    if ("birthYear" in patch) setYearText(patch.birthYear?.toString() ?? "");
    if ("employmentType" in patch) setEmploymentType(patch.employmentType ?? null);
    if ("annualSalary" in patch) {
      setSalary(patch.annualSalary ?? null);
      draft.current.salary = patch.annualSalary ?? null;
    }
    if ("pensionPercent" in patch) {
      setEmployee(patch.pensionPercent ?? null);
      draft.current.employee = patch.pensionPercent ?? null;
    }
    if ("pensionEmployerPercent" in patch) {
      setEmployer(patch.pensionEmployerPercent ?? null);
      draft.current.employer = patch.pensionEmployerPercent ?? null;
    }
  };

  /**
   * Saves one change. The saved copy moves first, so a second save that starts before this one
   * ends (Enter then leaving the field) is not repeated. On failure only this change goes back.
   */
  const saveFields = async (patch: Partial<AgeAndPayValues>) => {
    const keys = Object.keys(patch) as (keyof AgeAndPayValues)[];
    const previous = Object.fromEntries(
      keys.map((key) => [key, saved.current[key]]),
    ) as Partial<AgeAndPayValues>;
    saved.current = { ...saved.current, ...patch };
    setField(patch);
    setSaveError(null);
    try {
      await save(patch as UserProfileUpdate);
      toast?.({ title: AGE_AND_PAY_SAVED_MESSAGE, tone: "positive" });
    } catch {
      saved.current = { ...saved.current, ...previous };
      setField(previous);
      setSaveError(AGE_AND_PAY_SAVE_FAILED);
    }
  };

  const yearOutOfRange = `Enter a year between ${EARLIEST_BIRTH_YEAR} and ${currentYear}.`;

  const commitYear = () => {
    const parsed = parseBirthYear(yearText, currentYear);
    if (parsed === "invalid") {
      setYearError(yearOutOfRange);
      return;
    }
    setYearError(null);
    if (parsed === saved.current.birthYear) return;
    void saveFields({ birthYear: parsed });
  };

  const commitSalary = () => {
    const value = draft.current.salary;
    if (value === saved.current.annualSalary) return;
    void saveFields({ annualSalary: value });
  };

  const commitEmploymentType = (value: EmploymentType | null) => {
    if (value === saved.current.employmentType) return;
    void saveFields({ employmentType: value });
  };

  /**
   * Both rates save together once either is entered, so saving makes them a choice (as on the
   * Pension page). While the rates are still the assumed creation defaults, an empty rate beside
   * an entered one keeps its saved value (the assumed rate), so typing only your own rate does not
   * drop the employer's. The rates are always stored (the columns cannot be empty), so once they
   * are a choice an emptied rate is not saved: it shows its saved value again. Typing 0 saves 0%.
   */
  const commitPension = () => {
    const assumed =
      saved.current.pensionPercent === null && saved.current.pensionEmployerPercent === null;
    let { employee: own, employer: theirs } = draft.current;
    if (!assumed && (own === null || theirs === null)) {
      own = own ?? saved.current.pensionPercent;
      theirs = theirs ?? saved.current.pensionEmployerPercent;
      setField({ pensionPercent: own, pensionEmployerPercent: theirs });
    }
    if (own === saved.current.pensionPercent && theirs === saved.current.pensionEmployerPercent) {
      return;
    }
    if (own === null && theirs === null) return;
    void saveFields({
      pensionPercent: own ?? profile.pensionPercent ?? 0,
      pensionEmployerPercent: theirs ?? profile.pensionEmployerPercent ?? 0,
    });
  };

  /** Moving between the two rate fields is not leaving them: the pair saves once focus goes. */
  const leavePension = (event: FocusEvent<HTMLInputElement>) => {
    const next = event.relatedTarget as HTMLElement | null;
    if (next && PENSION_FIELD_IDS.includes(next.id)) return;
    commitPension();
  };

  const onEnter = (commit: () => void) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") commit();
  };

  const typedYear = parseBirthYear(yearText, currentYear);
  const ageHint =
    typeof typedYear === "number" ? `You turn ${currentYear - typedYear} this year.` : undefined;
  const ratesNotSet = saved.current.pensionPercent === null && employee === null;
  const employerNotSet = saved.current.pensionEmployerPercent === null && employer === null;

  // Pounds a month need a saved salary to turn into the stored percentage: without one the switch
  // stays on "% of salary" and says why. The saved rates apply to the whole salary.
  const basis = { annualSalary: saved.current.annualSalary };
  const canUseMonthly = (saved.current.annualSalary ?? 0) > 0;
  const unit: ContributionUnit = canUseMonthly ? unitChoice : "percent";
  const monthlyShown = (key: "employee" | "employer", percent: number | null) => {
    const typed = typedMonthly[key];
    if (typed !== undefined) return typed;
    const monthly = contributionMonthlyFromPercent(percent, basis);
    return monthly === null ? null : Math.round(monthly * 100) / 100;
  };
  const switchUnit = (next: string) => {
    setTypedMonthly({});
    setUnitChoice(next as ContributionUnit);
  };
  /** The other form beside the one being entered, or "Not set" while the rate is assumed. */
  const contributionHint = (notSet: boolean, percent: number | null) => {
    if (notSet) return "Not set";
    if (unit === "monthly") return contributionPercentHint(percent);
    return contributionMonthlyHint(contributionMonthlyFromPercent(percent, basis), formatPounds);
  };

  const renderContributionInput = (
    key: "employee" | "employer",
    field: FormFieldControlState,
    testId: string,
    percent: number | null,
    setPercent: (value: number | null) => void,
  ) =>
    unit === "monthly" ? (
      <CurrencyInput
        {...controlProps(field)}
        className={numericField()}
        data-testid={testId}
        // A month of the whole salary is 100%, the most a rate can be.
        max={(saved.current.annualSalary ?? 0) / 12}
        min={0}
        value={monthlyShown(key, percent)}
        onBlur={leavePension}
        onKeyDown={onEnter(commitPension)}
        onValueChange={(monthly) => {
          setTypedMonthly((typed) => ({ ...typed, [key]: monthly }));
          const converted = contributionPercentFromMonthly(monthly, basis);
          draft.current[key] = converted;
          setPercent(converted);
        }}
      />
    ) : (
      <PercentInput
        {...controlProps(field)}
        className={numericField()}
        data-testid={testId}
        max={100}
        min={0}
        value={percent}
        onBlur={leavePension}
        onKeyDown={onEnter(commitPension)}
        onValueChange={(value) => {
          draft.current[key] = value;
          setPercent(value);
        }}
      />
    );
  const unitLabel = unit === "monthly" ? "£ a month" : "% of salary";

  return (
    <PageSection
      className={ageAndPayAnchor()}
      description="Your year of birth, employment type, salary and pension. Your pension, retirement, budget and tax pages use these."
      headingId="age-and-pay-heading"
      icon={CalendarDays}
      id={AGE_AND_PAY_SECTION_ID}
      title="Your age and pay"
      tone="neutral"
    >
      <Card className={sectionCard()}>
        <div className={fieldGrid()}>
          <FormField
            error={yearError ?? undefined}
            hint={ageHint}
            id="birth-year-input"
            label="Year of birth"
          >
            {(field) => (
              <WholeNumberInput
                {...controlProps(field)}
                autoComplete="bday-year"
                className={numericField()}
                data-testid="birth-year-input"
                pattern="[0-9]*"
                value={yearText === "" ? null : Number(yearText)}
                onBlur={commitYear}
                onValueChange={(year) => {
                  setYearText(year === null ? "" : String(year));
                  if (yearError) setYearError(null);
                }}
                onKeyDown={onEnter(commitYear)}
              />
            )}
          </FormField>
          <FormField id="employment-type-select" label="Employment type">
            {(field) => (
              <Select
                {...controlProps(field)}
                data-testid="employment-type-select"
                options={EMPLOYMENT_TYPE_OPTIONS}
                value={employmentType ?? ""}
                onChange={(e) =>
                  commitEmploymentType((e.target.value || null) as EmploymentType | null)
                }
              />
            )}
          </FormField>
          <FormField id="annual-salary-input" label="Yearly salary before tax">
            {(field) => (
              <CurrencyInput
                {...controlProps(field)}
                className={numericField()}
                data-testid="annual-salary-input"
                min={0}
                value={salary}
                onBlur={commitSalary}
                onKeyDown={onEnter(commitSalary)}
                onValueChange={(value) => {
                  draft.current.salary = value;
                  setSalary(value);
                }}
              />
            )}
          </FormField>
          <div className={pensionUnitRow()}>
            <p aria-hidden="true" className={pensionUnitLabel()}>
              {CONTRIBUTION_UNIT_LABEL}
            </p>
            <Tabs
              aria-label={CONTRIBUTION_UNIT_LABEL}
              items={CONTRIBUTION_UNIT_ITEMS.map((item) => ({
                ...item,
                disabled: item.value === "monthly" && !canUseMonthly,
              }))}
              size="sm"
              value={unit}
              onValueChange={switchUnit}
            />
            {canUseMonthly ? null : (
              <p
                className={pensionUnitNote()}
                data-testid="pension-unit-note"
                id="pension-unit-note"
              >
                {NO_SALARY_FOR_MONTHLY}
              </p>
            )}
          </div>
          <FormField
            hint={contributionHint(ratesNotSet, employee)}
            id="pension-percent-input"
            label={`Your pension contribution (${unitLabel})`}
          >
            {(field) =>
              renderContributionInput(
                "employee",
                field,
                "pension-percent-input",
                employee,
                setEmployee,
              )
            }
          </FormField>
          <FormField
            hint={contributionHint(employerNotSet, employer)}
            id="pension-employer-percent-input"
            label={`Employer contribution (${unitLabel})`}
          >
            {(field) =>
              renderContributionInput(
                "employer",
                field,
                "pension-employer-percent-input",
                employer,
                setEmployer,
              )
            }
          </FormField>
        </div>
        <p className={pensionLinkRow()}>
          Contribution method and pots:
          {inRouter ? (
            <ButtonLink
              asChild
              data-testid="age-and-pay-pension-link"
              id="age-and-pay-pension-link"
              size="sm"
              variant="link"
            >
              <Link to={PENSION_HREF}>Your pension</Link>
            </ButtonLink>
          ) : (
            <ButtonLink
              data-testid="age-and-pay-pension-link"
              href={PENSION_HREF}
              id="age-and-pay-pension-link"
              size="sm"
              variant="link"
            >
              Your pension
            </ButtonLink>
          )}
        </p>
        {saveError ? (
          <p
            className={statusText({ tone: "danger" })}
            data-testid="age-and-pay-error"
            id="age-and-pay-error"
            role="alert"
          >
            {saveError}
          </p>
        ) : null}
      </Card>
    </PageSection>
  );
};
