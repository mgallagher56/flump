import type { DebtItem } from "@repo/common";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useState } from "react";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";

export interface AddDebtDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDebt: (debt: Omit<DebtItem, "id">) => void;
}

const overlayStyle = css({
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0, 0, 0, 0.6)",
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
  backgroundColor: "card",
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "border",
  padding: "24px",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
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
  backgroundColor: "background",
  color: "text.primary",
  fontSize: "14px",
});

export const AddDebtDialog: FC<AddDebtDialogProps> = ({ isOpen, onClose, onAddDebt }) => {
  const [name, setName] = useState("");
  const [balance, setBalance] = useState<number>(1000);
  const [apr, setApr] = useState<number>(21.9);
  const [minimumPayment, setMinimumPayment] = useState<number>(30);
  const [type, setType] = useState<DebtItem["type"]>("credit_card");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddDebt({
      name: name.trim(),
      balance: Number(balance),
      apr: Number(apr),
      minimumPayment: Number(minimumPayment),
      type,
    });
    setName("");
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
            Add Liability Account
          </FLPHeading>
          <FLPText color="text.muted" fontSize="xs">
            Log an unsecured debt, credit card, or overdraft for payoff optimization.
          </FLPText>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "14px" }}
        >
          <div className={fieldStyle}>
            <FLPText fontSize="sm">Account / Creditor Name</FLPText>
            <input
              required
              className={inputStyle}
              placeholder="e.g. Barclaycard Platinum, Klarna, Overdraft"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className={fieldStyle}>
              <FLPText fontSize="sm">Type</FLPText>
              <select
                aria-label="Debt Type"
                className={inputStyle}
                value={type}
                onChange={(e) => setType(e.target.value as any)}
              >
                <option value="credit_card">Credit Card</option>
                <option value="loan">Personal Loan</option>
                <option value="overdraft">Arranged Overdraft</option>
                <option value="bnpl">Buy-Now-Pay-Later</option>
                <option value="car_finance">Car Finance / HP</option>
                <option value="other">Other Liability</option>
              </select>
            </div>

            <div className={fieldStyle}>
              <FLPText fontSize="sm">Outstanding Balance (£)</FLPText>
              <input
                required
                className={inputStyle}
                min="1"
                type="number"
                value={balance}
                onChange={(e) => setBalance(Number(e.target.value))}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className={fieldStyle}>
              <FLPText fontSize="sm">APR Rate (%)</FLPText>
              <input
                required
                className={inputStyle}
                min="0"
                step="0.1"
                type="number"
                value={apr}
                onChange={(e) => setApr(Number(e.target.value))}
              />
            </div>

            <div className={fieldStyle}>
              <FLPText fontSize="sm">Monthly Minimum (£)</FLPText>
              <input
                required
                className={inputStyle}
                min="5"
                type="number"
                value={minimumPayment}
                onChange={(e) => setMinimumPayment(Number(e.target.value))}
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
              Add Liability
            </FLPButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDebtDialog;
