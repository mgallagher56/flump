import { Button, CurrencyInput, controlProps, FormField, Icon, PercentInput } from "@repo/ui";
import { Check, Pencil, X } from "lucide-react";
import { type FC, type FormEvent, type ReactNode, useState } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import {
  buttonRow,
  checkHint,
  checkRow,
  checkStack,
  detailsHeader,
  detailsRoot,
  detailsTitle,
  editGrid,
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
  employeePercent: number;
  employerPercent: number;
  isSalarySacrifice: boolean;
  isSalarySacrificeEmployerNi: boolean;
  /** True for the backend default 5% and 3%, which the user may never have chosen. */
  ratesAssumed: boolean;
  /** False until the user saves a contribution method: it then reads "Not set". */
  methodSet?: boolean;
  isEditing: boolean;
  onEditingChange: (editing: boolean) => void;
  /** Saves to the profile. Rejects on failure. */
  onSave: (values: PensionDetailsSaveValues) => Promise<void>;
  /** Shown under the saved facts inside the same card (the pots list). */
  children?: ReactNode;
}

const percentFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });
const formatPercent = (value: number) => `${percentFormat.format(value)}%`;
const NOT_SET = "Not set";

const ASSUMED_RATE_LABEL = "Assumed: the auto-enrolment minimum. Edit to match your payslip.";

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
        <FormField label="Your contribution (% of salary)">
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
        <FormField label="Employer contribution (% of salary)">
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
  ratesAssumed,
  methodSet = true,
  isEditing,
  onEditingChange,
  onSave,
  children,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const method = !methodSet
    ? NOT_SET
    : isSalarySacrifice
      ? isSalarySacrificeEmployerNi
        ? "Salary sacrifice, employer adds its National Insurance"
        : "Salary sacrifice"
      : "No salary sacrifice";

  return (
    <section
      aria-labelledby="pension-details-title"
      className={detailsRoot()}
      data-testid="pension-details"
      id="pension-details"
      tabIndex={-1}
    >
      <div className={detailsHeader()}>
        <h2 className={detailsTitle()} id="pension-details-title">
          Your details
        </h2>
        {!isEditing && (
          <Button size="sm" type="button" variant="outline" onClick={() => onEditingChange(true)}>
            <Icon icon={Pencil} size="sm" />
            Edit details
          </Button>
        )}
      </div>

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
        <>
          <dl className={factList()}>
            <div className={factRow()}>
              <dt>Salary</dt>
              <dd className={factValue({ unset: !hasSalary })}>
                {hasSalary ? `${formatCurrency(annualSalary)} a year` : NOT_SET}
              </dd>
            </div>
            <div className={factRow()}>
              <dt>You pay</dt>
              <dd className={factValue()}>{formatPercent(employeePercent)} of salary</dd>
            </div>
            <div className={factRow()}>
              <dt>Employer pays</dt>
              <dd className={factValue()}>{formatPercent(employerPercent)} of salary</dd>
            </div>
            <div className={factRow()}>
              <dt>Method</dt>
              <dd className={factValue({ unset: !methodSet, wrap: true })}>{method}</dd>
            </div>
          </dl>
          {ratesAssumed && <p className={mutedNote()}>{ASSUMED_RATE_LABEL}</p>}
        </>
      )}
      {children}
    </section>
  );
};

export default PensionDetails;
