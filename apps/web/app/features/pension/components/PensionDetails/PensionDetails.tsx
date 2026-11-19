import { contributionMonthlyFromPercent } from "@flump/finance-engine";
import {
  Button,
  CollapsibleDrawer,
  CurrencyInput,
  controlProps,
  FormField,
  Icon,
  PageSection,
  PercentInput,
} from "@repo/ui";
import { Check, ClipboardList, Pencil, X } from "lucide-react";
import { type FC, type FormEvent, type ReactNode, useState } from "react";
import {
  contributionMonthlyHint,
  contributionRateText,
  NOT_SET,
} from "~/features/pension/contribution";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import {
  buttonRow,
  checkHint,
  checkRow,
  checkStack,
  detailsRoot,
  editGrid,
  editRow,
  factList,
  factRow,
  factValue,
  mutedNote,
} from "./PensionDetails.styles";

export interface PensionDetailsSaveValues {
  annualSalary: number | null;
  employeePercent: number | null;
  employerPercent: number | null;
  isSalarySacrifice: boolean;
  isSalarySacrificeEmployerNi: boolean;
  /**
   * True only when the user changed a contribution-method box in this edit. The boxes start from
   * the saved method or a guess, so an untouched method must not be saved as a choice.
   */
  methodChanged: boolean;
}

export interface PensionDetailsProps {
  hasSalary: boolean;
  annualSalary: number;
  /** The saved rate, or null when it has not been set (owner decision 3): it reads "Not set". */
  employeePercent: number | null;
  employerPercent: number | null;
  isSalarySacrifice: boolean;
  isSalarySacrificeEmployerNi: boolean;
  /** False until the user saves a contribution method: it then reads "Not set". */
  methodSet?: boolean;
  isEditing: boolean;
  onEditingChange: (editing: boolean) => void;
  /** Saves to the profile. Rejects on failure. */
  onSave: (values: PensionDetailsSaveValues) => Promise<void>;
  /** Shown under the saved facts inside the same card (the pots list). */
  children?: ReactNode;
  /** Opens the "Salary and contributions" drawer on mount, for the #pension-details deep link. */
  factsOpen?: boolean;
}

/** Under the facts when a rate is missing: what that means, then the drawer's one Edit button. */
const RATES_NOT_SET_NOTE = "Add your rates from your payslip to see what goes in each month.";

type FormProps = Pick<
  PensionDetailsProps,
  | "annualSalary"
  | "employeePercent"
  | "employerPercent"
  | "isSalarySacrifice"
  | "isSalarySacrificeEmployerNi"
  | "onSave"
  | "onEditingChange"
>;

/** Mounted only while editing, so the fields always start from the saved values. */
const DetailsForm: FC<FormProps> = ({
  annualSalary,
  employeePercent,
  employerPercent,
  isSalarySacrifice,
  isSalarySacrificeEmployerNi,
  onSave,
  onEditingChange,
}) => {
  // Held as numbers or null, so clearing a field never snaps back to 0 while typing.
  const [salary, setSalary] = useState<number | null>(annualSalary > 0 ? annualSalary : null);
  const [employee, setEmployee] = useState<number | null>(employeePercent);
  const [employer, setEmployer] = useState<number | null>(employerPercent);
  const [sacrifice, setSacrifice] = useState(isSalarySacrifice);
  const [employerNi, setEmployerNi] = useState(isSalarySacrificeEmployerNi);
  const [methodChanged, setMethodChanged] = useState(false);
  const [saving, setSaving] = useState(false);
  const { formatCurrency } = useFormatCurrency();
  // The pounds beside each rate, from the salary in the form; not known without one.
  const monthlyFor = (percent: number | null) =>
    contributionMonthlyFromPercent(percent, { annualSalary: salary });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave({
        annualSalary: salary,
        employeePercent: employee,
        employerPercent: employer,
        isSalarySacrifice: sacrifice,
        isSalarySacrificeEmployerNi: sacrifice && employerNi,
        methodChanged,
      });
      onEditingChange(false);
    } catch (err) {
      console.error("Failed to save pension details:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form aria-label="Edit your pension details" onSubmit={submit}>
      <div className={editGrid()}>
        <FormField label="Yearly salary before tax">
          {(field) => (
            <CurrencyInput
              {...controlProps(field)}
              min={0}
              value={salary}
              onValueChange={setSalary}
            />
          )}
        </FormField>
        <FormField
          hint={contributionMonthlyHint(monthlyFor(employee), formatCurrency)}
          label="Your contribution (% of salary)"
        >
          {(field) => (
            <PercentInput
              {...controlProps(field)}
              max={100}
              min={0}
              value={employee}
              onValueChange={setEmployee}
            />
          )}
        </FormField>
        <FormField
          hint={contributionMonthlyHint(monthlyFor(employer), formatCurrency)}
          label="Employer contribution (% of salary)"
        >
          {(field) => (
            <PercentInput
              {...controlProps(field)}
              max={100}
              min={0}
              value={employer}
              onValueChange={setEmployer}
            />
          )}
        </FormField>
        <div className={checkStack()}>
          <label className={checkRow()} htmlFor="pension-salary-sacrifice-checkbox">
            <input
              checked={sacrifice}
              id="pension-salary-sacrifice-checkbox"
              type="checkbox"
              onChange={(e) => {
                setMethodChanged(true);
                setSacrifice(e.target.checked);
                if (!e.target.checked) setEmployerNi(false);
              }}
            />
            <span>
              Paid by salary sacrifice
              <span className={checkHint()}>
                Taken from your pay before Income Tax and National Insurance.
              </span>
            </span>
          </label>
          <label
            className={checkRow()}
            data-disabled={!sacrifice}
            htmlFor="pension-employer-ni-checkbox"
          >
            <input
              checked={sacrifice && employerNi}
              disabled={!sacrifice}
              id="pension-employer-ni-checkbox"
              type="checkbox"
              onChange={(e) => {
                setMethodChanged(true);
                setEmployerNi(e.target.checked);
              }}
            />
            <span>
              Employer adds its National Insurance
              <span className={checkHint()}>
                {sacrifice
                  ? "Your employer adds the National Insurance it no longer pays to your pension."
                  : "Only with salary sacrifice"}
              </span>
            </span>
          </label>
        </div>
      </div>
      <div className={buttonRow()}>
        <Button size="sm" type="button" variant="ghost" onClick={() => onEditingChange(false)}>
          <Icon icon={X} size="sm" />
          Cancel
        </Button>
        <Button disabled={saving} size="sm" type="submit">
          <Icon icon={Check} size="sm" />
          {saving ? "Saving…" : "Save details"}
        </Button>
      </div>
    </form>
  );
};

/**
 * "Your details": the saved salary and contribution facts in one card, and the only place they
 * are edited. Reads saved data only; the scenario zone never writes here. One figure per row.
 */
export const PensionDetails: FC<PensionDetailsProps> = ({
  hasSalary,
  annualSalary,
  employeePercent,
  employerPercent,
  isSalarySacrifice,
  isSalarySacrificeEmployerNi,
  methodSet = true,
  isEditing,
  onEditingChange,
  onSave,
  children,
  factsOpen = false,
}) => {
  const { formatCurrency } = useFormatCurrency();
  // The saved rates apply to the whole salary; without one the pounds are not known.
  const basis = { annualSalary: hasSalary ? annualSalary : null };
  // After an edit (saved or cancelled) the drawer comes back open, where the user left it.
  const [reopenFacts, setReopenFacts] = useState(false);
  const startEditing = () => {
    setReopenFacts(true);
    onEditingChange(true);
  };
  // A rate that is not set reads "Not set", never a stand-in 5% or 3% or 0%.
  const rateText = (percent: number | null): string =>
    percent === null
      ? NOT_SET
      : contributionRateText(
          percent,
          contributionMonthlyFromPercent(percent, basis),
          formatCurrency,
        );
  const ratesNotSet = employeePercent === null || employerPercent === null;
  const method = !methodSet
    ? NOT_SET
    : isSalarySacrifice
      ? isSalarySacrificeEmployerNi
        ? "Salary sacrifice, employer adds its National Insurance"
        : "Salary sacrifice"
      : "No salary sacrifice";

  return (
    <PageSection
      description="Your pots and the salary and contributions you saved."
      domain="pension"
      headingId="pension-details-title"
      icon={ClipboardList}
      id="pension-details"
      title="Your details"
    >
      <div className={detailsRoot()}>
        {children}
        {/* Each thing has one edit button: pots on their rows, salary and contributions inside
          their own drawer, which the form replaces while editing. */}
        {isEditing ? (
          <DetailsForm
            annualSalary={annualSalary}
            employeePercent={employeePercent}
            employerPercent={employerPercent}
            isSalarySacrifice={isSalarySacrifice}
            isSalarySacrificeEmployerNi={isSalarySacrificeEmployerNi}
            onEditingChange={onEditingChange}
            onSave={onSave}
          />
        ) : (
          // The saved facts sit behind a quiet drawer, closed by default, so the first view keeps
          // to the headline and the strip (E16 P1.1).
          <CollapsibleDrawer
            defaultOpen={factsOpen || reopenFacts}
            key={factsOpen ? "open" : "closed"}
            title="Salary and contributions"
            variant="quiet"
          >
            <dl className={factList()}>
              <div className={factRow()}>
                <dt>Salary</dt>
                <dd className={factValue({ unset: !hasSalary })}>
                  {hasSalary ? `${formatCurrency(annualSalary)} a year` : NOT_SET}
                </dd>
              </div>
              <div className={factRow()}>
                <dt>You pay</dt>
                <dd className={factValue({ unset: employeePercent === null, wrap: true })}>
                  {rateText(employeePercent)}
                </dd>
              </div>
              <div className={factRow()}>
                <dt>Employer pays</dt>
                <dd className={factValue({ unset: employerPercent === null, wrap: true })}>
                  {rateText(employerPercent)}
                </dd>
              </div>
              <div className={factRow()}>
                <dt>Method</dt>
                <dd className={factValue({ unset: !methodSet, wrap: true })}>{method}</dd>
              </div>
            </dl>
            {ratesNotSet && <p className={mutedNote()}>{RATES_NOT_SET_NOTE}</p>}
            <div className={editRow()}>
              <Button
                aria-label="Edit salary and contributions"
                size="sm"
                type="button"
                variant="ghost"
                onClick={startEditing}
              >
                <Icon icon={Pencil} size="sm" />
                Edit
              </Button>
            </div>
          </CollapsibleDrawer>
        )}
      </div>
    </PageSection>
  );
};

export default PensionDetails;
