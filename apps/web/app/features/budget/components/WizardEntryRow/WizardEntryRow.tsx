import { Button, CurrencyInput, Icon } from "@repo/ui";
import { Trash2 } from "lucide-react";
import { type FC, useState } from "react";
import type { BudgetEntry } from "~/types/budget";
import { nativeSelect } from "../BudgetEntryDialog";
import {
  amountField,
  entryControls,
  entryName,
  entryRow,
  essentialToggle,
  frequencySelect,
} from "./WizardEntryRow.styles";

export interface WizardEntryRowProps {
  entry: BudgetEntry;
  onUpdate: (id: string, update: Partial<BudgetEntry>) => void;
  onDelete: (id: string) => void;
  deleting?: boolean;
}

/** One editable entry in a wizard step: amount, frequency, essential toggle and remove. */
export const WizardEntryRow: FC<WizardEntryRowProps> = ({
  entry,
  onUpdate,
  onDelete,
  deleting,
}) => {
  // Keep what is typed (including an empty field); the entry itself always gets a number.
  const [draft, setDraft] = useState<number | null>(
    Number.isFinite(Number(entry.amount)) ? Number(entry.amount) : 0,
  );

  return (
    <div className={entryRow()}>
      <div>
        <p className={entryName()}>{entry.name}</p>
        {!entry.isIncome && (
          <button
            aria-pressed={entry.isEssential}
            className={essentialToggle()}
            title="Switch between essential and flexible spending"
            type="button"
            onClick={() => onUpdate(entry.id, { isEssential: !entry.isEssential })}
          >
            {entry.isEssential ? "Essential" : "Flexible"}
          </button>
        )}
      </div>
      <div className={entryControls()}>
        <div className={amountField()}>
          <CurrencyInput
            aria-label={`Amount for ${entry.name}`}
            size="sm"
            value={draft}
            onValueChange={(value) => {
              setDraft(value);
              onUpdate(entry.id, { amount: value ?? 0 });
            }}
          />
        </div>
        <select
          aria-label={`Frequency for ${entry.name}`}
          className={`${nativeSelect()} ${frequencySelect()}`}
          value={entry.frequency}
          onChange={(e) =>
            onUpdate(entry.id, { frequency: e.target.value as BudgetEntry["frequency"] })
          }
        >
          <option value="monthly">a month</option>
          <option value="annual">a year</option>
          <option value="weekly">a week</option>
        </select>
      </div>
      <Button
        aria-label={`Remove ${entry.name}`}
        disabled={deleting}
        size="sm"
        title={`Remove ${entry.name}`}
        variant="ghost"
        onClick={() => onDelete(entry.id)}
      >
        <Icon icon={Trash2} size="sm" />
      </Button>
    </div>
  );
};
