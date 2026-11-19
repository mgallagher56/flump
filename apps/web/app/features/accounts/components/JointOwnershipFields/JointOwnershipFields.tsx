import { type AccountOwnership, DEFAULT_JOINT_SHARE_PERCENT } from "@flump/finance-engine";
import { controlProps, FormField, PercentInput, Select } from "@repo/ui";
import type { FC } from "react";
import { jointFields } from "./JointOwnershipFields.styles";

export const OWNERSHIP_OPTIONS = [
  { value: "sole", label: "Sole (yours only)" },
  { value: "joint", label: "Joint" },
] as const;

export interface JointOwnershipFieldsProps {
  ownership: AccountOwnership;
  /** The user's share, 1 to 100, shown while the account is joint. */
  sharePercent: number | null;
  onOwnershipChange: (ownership: AccountOwnership) => void;
  onSharePercentChange: (sharePercent: number | null) => void;
}

/**
 * Ownership and the user's share of a joint account: one pair of fields for every form that adds
 * or edits an account (system audit slice 4, SD-8). The parent shows it only when the account's
 * field set allows a joint account, and says beside its balance that the balance is the whole of
 * it (decision 9 A).
 */
export const JointOwnershipFields: FC<JointOwnershipFieldsProps> = ({
  ownership,
  sharePercent,
  onOwnershipChange,
  onSharePercentChange,
}) => (
  <div className={jointFields()}>
    <FormField label="Ownership">
      {(field) => (
        <Select
          {...controlProps(field)}
          name="ownership"
          options={OWNERSHIP_OPTIONS}
          value={ownership}
          onChange={(e) => onOwnershipChange(e.target.value === "joint" ? "joint" : "sole")}
        />
      )}
    </FormField>
    {ownership === "joint" ? (
      <FormField label="Your share">
        {(field) => (
          <PercentInput
            {...controlProps(field)}
            max={100}
            min={1}
            name="sharePercent"
            value={sharePercent}
            onValueChange={onSharePercentChange}
          />
        )}
      </FormField>
    ) : null}
  </div>
);

/** The share to save: 1 to 100, whole, for a joint account; null for a sole one. */
export const resolveSharePercent = (
  ownership: AccountOwnership,
  sharePercent: number | null,
): number | null =>
  ownership === "joint"
    ? Math.min(100, Math.max(1, Math.round(sharePercent ?? DEFAULT_JOINT_SHARE_PERCENT)))
    : null;

export default JointOwnershipFields;
