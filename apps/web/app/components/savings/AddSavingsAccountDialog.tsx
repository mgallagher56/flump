import { css } from "@repo/ui/styled-system/css";
import { type FC, useCallback, useEffect, useState } from "react";
import { FaPlus } from "react-icons/fa";
import { useFetcher } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPModal from "~/components/core/dialogs/FLPModal";
import FLPText from "~/components/core/typography/FLPText";
import type { Account } from "~/containers/accounts/types";

interface AddSavingsAccountDialogProps {
  accountToEdit?: Account | null;
  isOpen: boolean;
  onClose: () => void;
  triggerButton?: React.ReactElement;
}

const formGroupStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  marginBottom: "16px",
});

const inputStyle = css({
  width: "100%",
  padding: "10px 14px",
  fontSize: "sm",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "border",
  backgroundColor: "surface",
  color: "text.primary",
  outline: "none",
  transition: "all 0.2s",
  _focus: {
    borderColor: "primary",
    boxShadow: "0 0 0 1px token(colors.primary)",
  },
});

const selectStyle = css({
  width: "100%",
  padding: "10px 14px",
  fontSize: "sm",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "border",
  backgroundColor: "surface",
  color: "text.primary",
  outline: "none",
  cursor: "pointer",
  transition: "all 0.2s",
  _focus: {
    borderColor: "primary",
  },
});

const rowTwoColStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", sm: "1fr 1fr" },
  gap: "16px",
});

export const AddSavingsAccountDialog: FC<AddSavingsAccountDialogProps> = ({
  accountToEdit,
  isOpen,
  onClose,
  triggerButton,
}) => {
  const fetcher = useFetcher();
  const isEditing = !!accountToEdit;

  const [name, setName] = useState(accountToEdit?.name || "");
  const [type, setType] = useState<"Saving" | "Investment">(
    accountToEdit?.type === "Investment" ? "Investment" : "Saving",
  );
  const [balance, setBalance] = useState<string>(
    accountToEdit?.balance !== undefined && accountToEdit.balance !== null
      ? String(accountToEdit.balance)
      : "",
  );
  const [interestRate, setInterestRate] = useState<string>(
    accountToEdit?.interestRate !== undefined && accountToEdit.interestRate !== null
      ? String(accountToEdit.interestRate)
      : "4.5",
  );
  const [monthlyContribution, setMonthlyContribution] = useState<string>(
    accountToEdit?.monthlyContribution !== undefined && accountToEdit.monthlyContribution !== null
      ? String(accountToEdit.monthlyContribution)
      : "100",
  );

  // Sync inputs whenever accountToEdit or isOpen changes
  useEffect(() => {
    if (isOpen && accountToEdit) {
      setName(accountToEdit.name || "");
      setType(accountToEdit.type === "Investment" ? "Investment" : "Saving");
      setBalance(
        accountToEdit.balance !== undefined && accountToEdit.balance !== null
          ? String(accountToEdit.balance)
          : "",
      );
      setInterestRate(
        accountToEdit.interestRate !== undefined && accountToEdit.interestRate !== null
          ? String(accountToEdit.interestRate)
          : "4.5",
      );
      setMonthlyContribution(
        accountToEdit.monthlyContribution !== undefined &&
          accountToEdit.monthlyContribution !== null
          ? String(accountToEdit.monthlyContribution)
          : "100",
      );
    } else if (isOpen && !accountToEdit) {
      setName("");
      setType("Saving");
      setBalance("");
      setInterestRate("4.5");
      setMonthlyContribution("100");
    }
  }, [accountToEdit, isOpen]);

  const handleSubmit = useCallback(() => {
    if (!name.trim()) return;

    fetcher.submit(
      {
        intent: isEditing ? "updateSavingsAccount" : "createSavingsAccount",
        accountId: accountToEdit?.id || "",
        name: name.trim(),
        type,
        balance: balance !== "" && balance !== undefined ? String(Number(balance) || 0) : "0",
        interestRate:
          interestRate !== "" && interestRate !== undefined
            ? String(Number(interestRate) || 0)
            : "0",
        monthlyContribution:
          monthlyContribution !== "" && monthlyContribution !== undefined
            ? String(Number(monthlyContribution) || 0)
            : "0",
      },
      { method: "POST", action: "/app/savings" },
    );
    onClose();
  }, [
    name,
    type,
    balance,
    interestRate,
    monthlyContribution,
    isEditing,
    accountToEdit,
    fetcher,
    onClose,
  ]);

  const defaultTrigger = (
    <FLPButton size="sm" variant="primary">
      <FaPlus style={{ marginRight: "6px" }} /> Add Savings Account
    </FLPButton>
  );

  return (
    <FLPModal
      confirmButton={{
        text: isEditing ? "Save Changes" : "Add Account",
      }}
      disabled={!name.trim()}
      open={isOpen}
      title={isEditing ? "Edit Savings Account" : "Add Manual Savings Account"}
      triggerBtn={triggerButton || defaultTrigger}
      onClose={onClose}
      onConfirm={handleSubmit}
    >
      <div style={{ paddingTop: "8px" }}>
        <div className={formGroupStyle}>
          <label htmlFor="savings-account-name">
            <FLPText fontSize="sm" fontWeight="medium">
              Account Name
            </FLPText>
          </label>
          <input
            id="savings-account-name"
            className={inputStyle}
            placeholder="e.g. Marcus High Yield, Vanguard ISA, Emergency Fund"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className={formGroupStyle}>
          <label htmlFor="savings-account-type">
            <FLPText fontSize="sm" fontWeight="medium">
              Account Type
            </FLPText>
          </label>
          <select
            id="savings-account-type"
            className={selectStyle}
            value={type}
            onChange={(e) => setType(e.target.value as "Saving" | "Investment")}
          >
            <option value="Saving">Savings Account / Cash ISA</option>
            <option value="Investment">Investment / Stocks & Shares ISA</option>
          </select>
        </div>

        <div className={rowTwoColStyle}>
          <div className={formGroupStyle}>
            <label htmlFor="savings-account-balance">
              <FLPText fontSize="sm" fontWeight="medium">
                Current Balance (£)
              </FLPText>
            </label>
            <input
              id="savings-account-balance"
              className={inputStyle}
              min="0"
              placeholder="0.00"
              step="any"
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
            />
          </div>

          <div className={formGroupStyle}>
            <label htmlFor="savings-account-interest">
              <FLPText fontSize="sm" fontWeight="medium">
                Interest rate / AER (%)
              </FLPText>
            </label>
            <input
              id="savings-account-interest"
              className={inputStyle}
              max="100"
              min="0"
              placeholder="e.g. 4.5"
              step="0.01"
              type="number"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
            />
          </div>
        </div>

        <div className={formGroupStyle}>
          <label htmlFor="savings-account-contribution">
            <FLPText fontSize="sm" fontWeight="medium">
              Regular Monthly Savings Contribution (£/month)
            </FLPText>
          </label>
          <input
            id="savings-account-contribution"
            className={inputStyle}
            min="0"
            placeholder="e.g. 250"
            step="any"
            type="number"
            value={monthlyContribution}
            onChange={(e) => setMonthlyContribution(e.target.value)}
          />
          <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "4px" }}>
            The amount you intend to deposit into this account each month.
          </FLPText>
        </div>
      </div>
    </FLPModal>
  );
};

export default AddSavingsAccountDialog;
