import { Button, CurrencyInput, controlProps, Dialog, FormField } from "@repo/ui";
import { type FC, type FormEvent, useEffect, useState } from "react";
import { SampleAwareLink } from "~/components/navigation/SampleAwareLink";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { housingDetails } from "./HousingDetails.styles";

export type HousingTenure = "renting" | "mortgage" | "own_outright" | "living_with_family" | null;

export interface HousingDetailsProps {
  /** How the user pays for housing, from their saved details. Null when not said yet. */
  housingStatus: HousingTenure;
  /**
   * The saved monthly amount, to fill the form. Shown only when it differs from `rowTotal`, so
   * the same figure never shows twice.
   */
  savedAmount?: number | null;
  /** The housing row's total from budget entries. */
  rowTotal?: number;
  /** Saves the monthly amount to the profile. */
  onSave: (monthly: number) => Promise<void>;
}

export const HOUSING_SAVE_ERROR = "We could not save that. Nothing has changed. Try again.";

/** The short tenure word for the housing row in "Where your money goes". */
export function housingTenureLabel(status: HousingTenure): string | undefined {
  switch (status) {
    case "renting":
      return "Renting";
    case "mortgage":
      return "Mortgage";
    case "own_outright":
      return "Own outright";
    case "living_with_family":
      return "Living with family or friends";
    default:
      return undefined;
  }
}

interface Copy {
  text: string;
  action?: string;
  field?: string;
  /** £0 is a real answer when living with family or friends. */
  allowZero?: boolean;
}

function copyFor(status: HousingTenure, hasAmount: boolean): Copy | null {
  switch (status) {
    case "renting":
      return {
        text: "Your rent is saved in your details and used across Flump.",
        action: "Edit your rent",
        field: "Rent each month",
      };
    case "living_with_family":
      return {
        text: "You live with family or friends. What you pay towards the household is saved in your details.",
        action: "Edit what you pay",
        field: "What you pay each month",
        allowZero: true,
      };
    case "mortgage":
      return { text: "Your balance, rate and term are on the mortgage page." };
    case "own_outright":
      return null;
    default:
      return {
        text: hasAmount
          ? "Your rent is saved in your details and used across Flump."
          : "Add your rent to your details so Flump can use it across the app.",
        action: hasAmount ? "Edit your rent" : "Add your rent",
        field: "Rent each month",
      };
  }
}

/**
 * Housing inside the budget's housing row (E16 R2-6). The row's amount is the one housing figure
 * on the page; this line says where the saved figure lives and opens its form in a dialog, so no
 * form sits in the page and the amount is not shown twice. Facts only: no share, target or status
 * colour.
 */
export const HousingDetails: FC<HousingDetailsProps> = ({
  housingStatus,
  savedAmount = null,
  rowTotal = 0,
  onSave,
}) => {
  const slots = housingDetails();
  const { formatCurrency } = useFormatCurrency();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number | null>(savedAmount);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!open) setAmount(savedAmount);
  }, [savedAmount, open]);

  const copy = copyFor(housingStatus, savedAmount !== null && savedAmount > 0);
  if (!copy) return null;
  // The saved figure differs from the budget rows (or there are none): say what is saved.
  const savedDiffers =
    copy.field !== undefined &&
    savedAmount !== null &&
    (savedAmount > 0 || housingStatus === "living_with_family") &&
    Math.round(savedAmount) !== Math.round(rowTotal);
  const text = savedDiffers ? (
    <>
      Saved in your details:{" "}
      <span className={slots.figure} data-testid="housing-details-saved" id="housing-details-saved">
        {formatCurrency(savedAmount ?? 0, { maximumFractionDigits: 0 })}
      </span>{" "}
      a month.
    </>
  ) : (
    copy.text
  );
  const valid = amount !== null && (copy.allowZero ? amount >= 0 : amount > 0);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid || amount === null) return;
    setSaving(true);
    setError(undefined);
    try {
      await onSave(amount);
      setOpen(false);
    } catch {
      setError(HOUSING_SAVE_ERROR);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={slots.root} data-testid="housing-details" id="housing-details">
      <p className={slots.text}>{text}</p>
      {housingStatus === "mortgage" ? (
        <SampleAwareLink className={slots.link} to="/app/mortgage">
          Open the mortgage page
        </SampleAwareLink>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setError(undefined);
            setOpen(true);
          }}
        >
          {copy.action}
        </Button>
      )}

      {copy.field ? (
        <Dialog
          description="This updates your details."
          open={open}
          size="sm"
          title={copy.action ?? "Housing"}
          onOpenChange={setOpen}
        >
          <form className={slots.form} onSubmit={submit}>
            <FormField error={error} label={copy.field}>
              {(field) => (
                <CurrencyInput
                  {...controlProps(field)}
                  min={0}
                  value={amount}
                  onValueChange={(value) => setAmount(value)}
                />
              )}
            </FormField>
            <div>
              <Button disabled={saving || !valid} type="submit">
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </Dialog>
      ) : null}
    </div>
  );
};
