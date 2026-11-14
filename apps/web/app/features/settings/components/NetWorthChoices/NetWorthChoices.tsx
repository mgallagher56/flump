import { Card, Switch } from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import { type FC, useEffect, useState } from "react";
import {
  sectionCard,
  sectionHeading,
  sectionLead,
  statusText,
} from "~/features/settings/settings.styles";
import { choiceList, choicesAnchor } from "./NetWorthChoices.styles";

/** The anchor the "Change what counts" links point at (/app/profile?tab=profile#net-worth). */
export const NET_WORTH_CHOICES_ID = "net-worth";

export const NET_WORTH_CHOICES_TITLE = "What counts in your net worth";
export const PROPERTY_CHOICE_LABEL = "Count property you own, less the mortgage on it";
export const STUDENT_LOAN_CHOICE_LABEL = "Count your student loan as a debt";
export const NET_WORTH_CHOICES_HELPER =
  "Other debts, including loans secured on your home, always count. Changes are saved straight away.";

const HELPER_ID = "net-worth-choices-helper";
export const NET_WORTH_CHOICES_ERROR =
  "We could not save that change. Nothing has changed. Try again.";

export interface NetWorthChoicesUpdate {
  netWorthCountsProperty?: boolean;
  netWorthCountsStudentLoan?: boolean;
}

export interface NetWorthChoicesProps {
  /** The saved choices (the profile's basis). */
  countProperty: boolean;
  countStudentLoan: boolean;
  /** Saves one change through the profile update. Rejects when the save fails. */
  onSave: (update: NetWorthChoicesUpdate) => Promise<void>;
}

/**
 * The two net worth choices (owner ruling): property with its mortgage, and the student loan.
 * Each switch saves as soon as it changes, like "Sections you use", and goes back if the save
 * fails. The words state what each choice does and never suggest which is better.
 */
export const NetWorthChoices: FC<NetWorthChoicesProps> = ({
  countProperty,
  countStudentLoan,
  onSave,
}) => {
  const [values, setValues] = useState({ countProperty, countStudentLoan });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValues({ countProperty, countStudentLoan });
  }, [countProperty, countStudentLoan]);

  // A "Change what counts" link lands here; the tab renders after the page, so scroll once.
  useEffect(() => {
    if (typeof window === "undefined" || window.location.hash !== `#${NET_WORTH_CHOICES_ID}`) {
      return;
    }
    document.getElementById(NET_WORTH_CHOICES_ID)?.scrollIntoView?.({ block: "start" });
  }, []);

  const change = async (key: keyof typeof values, on: boolean) => {
    // While a save is in flight the switches stay focusable (aria-disabled, not disabled, so
    // keyboard focus is kept) and further changes are ignored; the controlled value holds.
    if (saving) return;
    const previous = values;
    setValues({ ...values, [key]: on });
    setSaving(true);
    setError(null);
    try {
      await onSave(
        key === "countProperty"
          ? { netWorthCountsProperty: on }
          : { netWorthCountsStudentLoan: on },
      );
    } catch {
      setValues(previous);
      setError(NET_WORTH_CHOICES_ERROR);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      as="section"
      aria-labelledby="net-worth-choices-heading"
      className={cx(sectionCard(), choicesAnchor())}
      data-testid={NET_WORTH_CHOICES_ID}
      id={NET_WORTH_CHOICES_ID}
    >
      <h2 className={sectionHeading()} id="net-worth-choices-heading">
        {NET_WORTH_CHOICES_TITLE}
      </h2>
      <p className={sectionLead()} id={HELPER_ID}>
        {NET_WORTH_CHOICES_HELPER}
      </p>
      <div className={choiceList()}>
        <Switch
          aria-describedby={HELPER_ID}
          aria-disabled={saving || undefined}
          checked={values.countProperty}
          data-testid="net-worth-counts-property"
          id="net-worth-counts-property"
          label={PROPERTY_CHOICE_LABEL}
          onChange={(e) => change("countProperty", e.target.checked)}
        />
        <Switch
          aria-describedby={HELPER_ID}
          aria-disabled={saving || undefined}
          checked={values.countStudentLoan}
          data-testid="net-worth-counts-student-loan"
          id="net-worth-counts-student-loan"
          label={STUDENT_LOAN_CHOICE_LABEL}
          onChange={(e) => change("countStudentLoan", e.target.checked)}
        />
      </div>
      {error ? (
        <p
          className={statusText({ tone: "danger" })}
          data-testid="net-worth-choices-error"
          id="net-worth-choices-error"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </Card>
  );
};

export default NetWorthChoices;
