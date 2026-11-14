import type { Figure, HousingCost } from "@flump/finance-engine";
import { Button, Card, CurrencyInput, controlProps, Dialog, FormField, Icon } from "@repo/ui";
import { Pencil } from "lucide-react";
import { type FC, type FormEvent, useEffect, useState } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { housingDetails } from "./HousingDetailsCard.styles";

export interface HousingDetailsCardProps {
  /** The picture's housing cost. The card never recomputes it. */
  housingCost: Figure<HousingCost>;
  /** Saved monthly rent, to fill the rent field. */
  savedRent?: number | null;
  /** Saves the monthly rent to the profile. */
  onSaveRent: (monthly: number) => Promise<void>;
}

export const RENT_SAVE_ERROR = "We could not save your rent. Nothing has changed. Try again.";

/**
 * "Your details" for a renter on the budget page (E16 PR 5): the saved rent as one figure and an
 * "Edit" button. The rent form opens in a dialog, so no form sits in the page. Facts only: no
 * share, target or status colour.
 */
export const HousingDetailsCard: FC<HousingDetailsCardProps> = ({
  housingCost,
  savedRent = null,
  onSaveRent,
}) => {
  const slots = housingDetails();
  const { formatCurrency } = useFormatCurrency();
  const [open, setOpen] = useState(false);
  const [rent, setRent] = useState<number | null>(savedRent);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!open) setRent(savedRent);
  }, [savedRent, open]);

  const known =
    housingCost.status === "known" && housingCost.value.kind === "rent" ? housingCost.value : null;
  const monthly = known?.monthly ?? (savedRent && savedRent > 0 ? savedRent : null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (rent === null || !(rent > 0)) return;
    setSaving(true);
    setError(undefined);
    try {
      await onSaveRent(rent);
      setOpen(false);
    } catch {
      setError(RENT_SAVE_ERROR);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      aria-labelledby="budget-details-heading"
      as="section"
      data-testid="housing-details-card"
      id="housing-details-card"
      padding="lg"
    >
      <div className={slots.header}>
        <h2 className={slots.title} id="budget-details-heading">
          Your details
        </h2>
        <Button
          aria-label="Edit your rent"
          size="sm"
          variant="outline"
          onClick={() => {
            setError(undefined);
            setOpen(true);
          }}
        >
          <Icon icon={Pencil} size="sm" />
          Edit
        </Button>
      </div>
      <dl className={slots.list}>
        <div className={slots.row}>
          <dt className={slots.label}>Rent each month</dt>
          {monthly !== null ? (
            <dd
              className={slots.value}
              data-testid="housing-details-rent"
              id="housing-details-rent"
            >
              {formatCurrency(monthly, { maximumFractionDigits: 0 })}
            </dd>
          ) : (
            <dd className={slots.unset}>Not set</dd>
          )}
        </div>
      </dl>

      <Dialog
        description="Your rent is saved to your details and used across Flump."
        open={open}
        size="sm"
        title="Your rent"
        onOpenChange={setOpen}
      >
        <form className={slots.form} onSubmit={submit}>
          <FormField error={error} label="Rent each month">
            {(field) => (
              <CurrencyInput
                {...controlProps(field)}
                min={0}
                value={rent}
                onValueChange={(value) => setRent(value)}
              />
            )}
          </FormField>
          <div>
            <Button disabled={saving || rent === null || !(rent > 0)} type="submit">
              {saving ? "Saving…" : "Save rent"}
            </Button>
          </div>
        </form>
      </Dialog>
    </Card>
  );
};
