import type { DebtItem } from "@flump/finance-engine";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useState } from "react";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";

export interface AddDebtDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDebt: (debt: Omit<DebtItem, "id">) => void;
  /**
   * When set the dialog edits this debt instead of adding one. Only the name,
   * APR and minimum payment can be edited: PortfolioSnapshot prefers the latest
   * accountDetails value over account.balance, so a balance edit on an account
   * with history would have no effect.
   */
  debt?: DebtItem;
  /** Called in edit mode with only the fields that changed. */
  onEditDebt?: (id: string, updates: Partial<DebtItem>) => void;
}

const overlayStyle = css({
  position: "fixed",
  inset: 0,
  backgroundColor: "var(--colors-surface-scrim)",
  backdropFilter: "blur(4px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: "16px",
});

const modalStyle = css({
  width: "100%",
  maxWidth: "480px",
  backgroundColor: "surface.card",
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "border",
  padding: "24px",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  boxShadow: "var(--shadows-floating)",
});

const fieldStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
});

const inputStyle = css({
  padding: "8px 12px",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "border",
  backgroundColor: "surface.canvas",
  color: "text.primary",
  fontSize: "14px",
  fontVariantNumeric: "tabular-nums",
});

const toFieldValue = (value: number | undefined): string =>
  value === undefined || !Number.isFinite(value) ? "" : String(value);

const parseOptional = (value: string): number | null => {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

export const AddDebtDialog: FC<AddDebtDialogProps> = ({
  isOpen,
  onClose,
  onAddDebt,
  debt,
  onEditDebt,
}) => {
  const isEdit = debt !== undefined;
  const [name, setName] = useState(debt?.name ?? "");
  const [balance, setBalance] = useState("");
  const [apr, setApr] = useState(debt?.aprKnown === false ? "" : toFieldValue(debt?.apr));
  const [minimumPayment, setMinimumPayment] = useState(
    debt === undefined || debt.minimumPaymentEstimated ? "" : toFieldValue(debt.minimumPayment),
  );
  const [type, setType] = useState<DebtItem["type"]>("credit_card");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const aprValue = parseOptional(apr);
    const minimumValue = parseOptional(minimumPayment);

    if (debt) {
      const updates: Partial<DebtItem> = {};
      if (name.trim() !== debt.name) updates.name = name.trim();
      const aprWasKnown = debt.aprKnown !== false;
      if (aprValue === null ? aprWasKnown : !aprWasKnown || aprValue !== debt.apr) {
        updates.apr = aprValue ?? 0;
        updates.aprKnown = aprValue !== null;
      }
      const minimumWasEstimated = debt.minimumPaymentEstimated === true;
      if (
        minimumValue === null
          ? !minimumWasEstimated
          : minimumWasEstimated || minimumValue !== debt.minimumPayment
      ) {
        updates.minimumPayment = minimumValue ?? 0;
        updates.minimumPaymentEstimated = minimumValue === null;
      }
      if (Object.keys(updates).length > 0) onEditDebt?.(debt.id, updates);
      onClose();
      return;
    }

    const balanceValue = Number(balance);
    if (balance.trim() === "" || !Number.isFinite(balanceValue) || balanceValue <= 0) return;
    onAddDebt({
      name: name.trim(),
      balance: balanceValue,
      // A blank APR or minimum is unknown, never a made-up default. 0 is a real rate.
      apr: aprValue ?? 0,
      aprKnown: aprValue !== null,
      minimumPayment: minimumValue ?? 0,
      minimumPaymentEstimated: minimumValue === null,
      type,
    });
    setName("");
    setBalance("");
    setApr("");
    setMinimumPayment("");
    onClose();
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Backdrop click to dismiss
    // biome-ignore lint/a11y/useKeyWithClickEvents: Backdrop click to dismiss
    <div className={overlayStyle} onClick={onClose}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Prevent dialog click propagation */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Prevent dialog click propagation */}
      <div className={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div>
          <FLPHeading as="h3" size="lg">
            {isEdit ? "Edit debt" : "Add liability account"}
          </FLPHeading>
          <FLPText color="text.muted" fontSize="xs">
            {isEdit
              ? "Leave the APR or minimum payment blank if you don't know it yet."
              : "Log an unsecured debt, credit card, or overdraft for payoff optimization. Only the name and balance are required."}
          </FLPText>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "14px" }}
        >
          <div className={fieldStyle}>
            <FLPText fontSize="sm">Account / creditor name</FLPText>
            <input
              required
              aria-label="Account / creditor name"
              className={inputStyle}
              placeholder="e.g. Barclaycard Platinum, Klarna, Overdraft"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {isEdit ? null : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className={fieldStyle}>
                <FLPText fontSize="sm">Type</FLPText>
                <select
                  aria-label="Debt Type"
                  className={inputStyle}
                  value={type}
                  onChange={(e) => setType(e.target.value as DebtItem["type"])}
                >
                  <option value="credit_card">Credit card</option>
                  <option value="loan">Personal loan</option>
                  <option value="overdraft">Arranged overdraft</option>
                  <option value="bnpl">Buy-now-pay-later</option>
                  <option value="car_finance">Car finance / HP</option>
                  <option value="other">Other liability</option>
                </select>
              </div>

              <div className={fieldStyle}>
                <FLPText fontSize="sm">Outstanding balance (£)</FLPText>
                <input
                  required
                  aria-label="Outstanding balance (£)"
                  className={inputStyle}
                  min="0.01"
                  step="any"
                  type="number"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                />
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className={fieldStyle}>
              <FLPText fontSize="sm">APR (%), optional</FLPText>
              <input
                aria-label="APR (%)"
                className={inputStyle}
                min="0"
                placeholder="Not set"
                step="any"
                type="number"
                value={apr}
                onChange={(e) => setApr(e.target.value)}
              />
            </div>

            <div className={fieldStyle}>
              <FLPText fontSize="sm">Monthly minimum (£), optional</FLPText>
              <input
                aria-label="Monthly minimum (£)"
                className={inputStyle}
                min="0"
                placeholder="Not set"
                step="any"
                type="number"
                value={minimumPayment}
                onChange={(e) => setMinimumPayment(e.target.value)}
              />
            </div>
          </div>

          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}
          >
            <FLPButton type="button" variant="outline" onClick={onClose}>
              Cancel
            </FLPButton>
            <FLPButton type="submit" variant="primary">
              {isEdit ? "Save changes" : "Add liability"}
            </FLPButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDebtDialog;
