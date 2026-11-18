import { DEFAULT_JOINT_SHARE_PERCENT } from "@flump/finance-engine";
import { PercentInput, Select } from "@repo/ui";
import { type FC, useEffect, useRef, useState } from "react";
import { ownershipField, shareField, shareLabel } from "./EntryOwnershipField.styles";

export type EntryOwnership = "sole" | "joint";

export interface EntryOwnershipFieldProps {
  /** Prefix for the control ids and test ids, unique on the page. */
  idPrefix: string;
  /** The entry name, for the accessible labels. */
  entryName: string;
  ownership: EntryOwnership;
  /** The saved share of a joint entry; null reads as 50%, as for accounts. */
  sharePercent: number | null;
  /** Called when ownership changes, or when an edited share is left. */
  onChange: (ownership: EntryOwnership, sharePercent: number | null) => void;
}

const OWNERSHIP_OPTIONS = [
  { value: "sole", label: "Sole (yours only)" },
  { value: "joint", label: "Joint" },
];

/** The label a joint entry carries, as accounts show it: "Joint, 50%". */
export const jointShareLabel = (ownership: EntryOwnership, sharePercent: number | null) =>
  ownership === "joint" ? `Joint, ${sharePercent ?? DEFAULT_JOINT_SHARE_PERCENT}%` : null;

/**
 * Sole or joint for one budget entry, and the person's share when joint (E34 C1). The same
 * choice and share field the account form uses. A joint entry counts at the share in the figures.
 */
export const EntryOwnershipField: FC<EntryOwnershipFieldProps> = ({
  idPrefix,
  entryName,
  ownership,
  sharePercent,
  onChange,
}) => {
  const savedShare = sharePercent ?? DEFAULT_JOINT_SHARE_PERCENT;
  const [share, setShare] = useState<number | null>(savedShare);
  // The latest typed share, read on blur after PercentInput has rounded and clamped it.
  const shareRef = useRef<number | null>(savedShare);

  useEffect(() => {
    shareRef.current = savedShare;
    setShare(savedShare);
  }, [savedShare]);

  const saveShare = () => {
    const next = shareRef.current;
    if (next === null) {
      // A cleared share is not a change: show the saved share again.
      shareRef.current = savedShare;
      setShare(savedShare);
      return;
    }
    if (next !== savedShare) onChange("joint", next);
  };

  return (
    <div className={ownershipField()}>
      <Select
        aria-label={`Ownership of ${entryName}`}
        data-testid={`${idPrefix}-ownership`}
        id={`${idPrefix}-ownership`}
        options={OWNERSHIP_OPTIONS}
        size="sm"
        value={ownership}
        onChange={(event) =>
          event.target.value === "joint" ? onChange("joint", savedShare) : onChange("sole", null)
        }
      />
      {ownership === "joint" ? (
        <div className={shareField()}>
          <PercentInput
            aria-label={`Your share of ${entryName}`}
            data-testid={`${idPrefix}-share`}
            decimals={0}
            id={`${idPrefix}-share`}
            max={100}
            min={1}
            size="sm"
            value={share}
            onBlur={saveShare}
            onValueChange={(value) => {
              shareRef.current = value;
              setShare(value);
            }}
          />
        </div>
      ) : null}
      {ownership === "joint" ? (
        <span className={shareLabel()} data-testid={`${idPrefix}-joint-label`}>
          {jointShareLabel(ownership, sharePercent)}
        </span>
      ) : null}
    </div>
  );
};
