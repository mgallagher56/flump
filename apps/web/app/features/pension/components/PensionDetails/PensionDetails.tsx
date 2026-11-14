import {
  Button,
  CurrencyInput,
  controlProps,
  FormField,
  Icon,
  PercentInput,
  StatusBadge,
} from "@repo/ui";
import { Check, Pencil, X } from "lucide-react";
import { type FC, type FormEvent, useState } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import {
  assumedLabel,
  buttonRow,
  checkHint,
  checkRow,
  checkStack,
  detailsHeader,
  detailsHeadingRow,
  detailsRoot,
  detailsTitle,
  dot,
  editGrid,
  employeeSegment,
  employerSegment,
  legendGroup,
  legendItem,
  legendRow,
  mutedNote,
  niNote,
  proportionBar,
  savedDate,
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
  monthlyEmployeeContrib: number;
  standardMonthlyEmployerContrib: number;
  monthlyEmployerNiContrib: number;
  /** True for the backend default 5% and 3%, which the user may never have chosen. */
  ratesAssumed: boolean;
  /** False until the user saves a contribution method: it then reads "Not set". */
  methodSet?: boolean;
  /** ISO timestamp of the last profile save, when known. */
  updatedAt?: string | null;
  isEditing: boolean;
  onEditingChange: (editing: boolean) => void;
  /** Saves to the profile. Rejects on failure. */
  onSave: (values: PensionDetailsSaveValues) => Promise<void>;
}

const percentFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });
const formatPercent = (value: number) => `${percentFormat.format(value)}%`;
const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const ASSUMED_RATE_LABEL = "Default: auto-enrolment minimum. Edit to match your payslip";

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
        <FormField label="Annual salary">
          {(field) => (
            <CurrencyInput
              {...controlProps(field)}
              min={0}
              value={salary}
              onValueChange={setSalary}
            />
          )}
        </FormField>
        <FormField label="Your contribution">
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
        <FormField label="Employer contribution">
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
            <span>Salary sacrifice (saves NI)</span>
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
              Pass on employer NI
              <span className={checkHint()}>
                {sacrifice
                  ? "Your employer reinvests their NI saving into your pot"
                  : "Needs salary sacrifice"}
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
 * "Your details": the saved salary and contribution facts, and the only place they are edited.
 * Reads saved data only; the scenario zone never writes here.
 */
export const PensionDetails: FC<PensionDetailsProps> = ({
  hasSalary,
  annualSalary,
  employeePercent,
  employerPercent,
  isSalarySacrifice,
  isSalarySacrificeEmployerNi,
  monthlyEmployeeContrib,
  standardMonthlyEmployerContrib,
  monthlyEmployerNiContrib,
  ratesAssumed,
  methodSet = true,
  updatedAt,
  isEditing,
  onEditingChange,
  onSave,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const share = employeePercent + employerPercent || 1;
  const employeeShare = (employeePercent / share) * 100;
  const employerShare = (employerPercent / share) * 100;
  const updated = updatedAt ? new Date(updatedAt) : null;
  const hasUpdated = updated !== null && !Number.isNaN(updated.getTime());

  return (
    <section
      aria-labelledby="pension-details-title"
      className={detailsRoot()}
      data-testid="pension-details"
      id="pension-details"
      tabIndex={-1}
    >
      <div className={detailsHeader()}>
        <div className={detailsHeadingRow()}>
          <h2 className={detailsTitle()} id="pension-details-title">
            Your details
          </h2>
          <StatusBadge size="sm" variant="positive">
            Saved
          </StatusBadge>
          {hasUpdated && (
            <span className={savedDate()}>
              Last updated{" "}
              <time dateTime={updated.toISOString()}>{dateFormat.format(updated)}</time>
            </span>
          )}
        </div>
        {!isEditing && (
          <Button size="sm" type="button" variant="outline" onClick={() => onEditingChange(true)}>
            <Icon icon={Pencil} size="sm" />
            Edit details
          </Button>
        )}
      </div>

      {isEditing && (
        <DetailsForm
          annualSalary={annualSalary}
          employeePercent={employeePercent}
          employerPercent={employerPercent}
          isSalarySacrifice={isSalarySacrifice}
          isSalarySacrificeEmployerNi={isSalarySacrificeEmployerNi}
          onEditingChange={onEditingChange}
          onSave={onSave}
        />
      )}

      {/* SVG rect widths are attributes, so the split needs no inline style. */}
      <svg
        aria-hidden="true"
        className={proportionBar()}
        preserveAspectRatio="none"
        viewBox="0 0 100 12"
      >
        <rect className={employeeSegment()} height="12" width={employeeShare} x="0" />
        <rect className={employerSegment()} height="12" width={employerShare} x={employeeShare} />
      </svg>

      <div className={legendRow()}>
        <div className={legendGroup()}>
          <span className={legendItem()}>
            <span aria-hidden="true" className={dot({ series: "employee" })} />
            <span>
              <strong>You:</strong> {formatPercent(employeePercent)} (
              {formatCurrency(monthlyEmployeeContrib)} a month)
              {ratesAssumed && <span className={assumedLabel()}>{ASSUMED_RATE_LABEL}</span>}
            </span>
          </span>
          <span className={legendItem()}>
            <span aria-hidden="true" className={dot({ series: "employer" })} />
            <span>
              <strong>Employer:</strong> {formatPercent(employerPercent)} (
              {formatCurrency(standardMonthlyEmployerContrib)} a month
              {monthlyEmployerNiContrib > 0 && (
                <span className={niNote()}>+ {formatCurrency(monthlyEmployerNiContrib)} NI</span>
              )}
              ){ratesAssumed && <span className={assumedLabel()}>{ASSUMED_RATE_LABEL}</span>}
            </span>
          </span>
        </div>
        <p className={mutedNote()}>
          Salary:{" "}
          <strong>{hasSalary ? `${formatCurrency(annualSalary)} a year` : "not set"}</strong> ·{" "}
          {!methodSet
            ? "Contribution method: Not set"
            : isSalarySacrifice
              ? isSalarySacrificeEmployerNi
                ? "Salary sacrifice and employer NI"
                : "Salary sacrifice"
              : "Net pay"}
        </p>
      </div>
    </section>
  );
};

export default PensionDetails;
