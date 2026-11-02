import { css } from "@repo/ui/styled-system/css";
import { type FC, useCallback, useEffect, useState } from "react";
import { FaPlus } from "react-icons/fa";
import { useFetcher } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPModal from "~/components/core/dialogs/FLPModal";
import FLPText from "~/components/core/typography/FLPText";
import type { Account } from "~/containers/accounts/types";

interface AddPensionAccountDialogProps {
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

const rowTwoColStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", sm: "1fr 1fr" },
  gap: "16px",
});

const COMMON_PROVIDERS = [
  "Nest",
  "Aviva",
  "Scottish Widows",
  "The People's Pension",
  "Legal & General",
  "Vanguard SIPP",
  "Hargreaves Lansdown SIPP",
  "AJ Bell",
  "Standard Life",
  "Fidelity",
];

export const AddPensionAccountDialog: FC<AddPensionAccountDialogProps> = ({
  accountToEdit,
  isOpen,
  onClose,
  triggerButton,
}) => {
  const fetcher = useFetcher();
  const isEditing = !!accountToEdit;

  const [name, setName] = useState(accountToEdit?.name || "");
  const [balance, setBalance] = useState<string>(
    accountToEdit?.balance !== undefined && accountToEdit.balance !== null
      ? String(accountToEdit.balance)
      : "",
  );
  const [interestRate, setInterestRate] = useState<string>(
    accountToEdit?.interestRate !== undefined && accountToEdit.interestRate !== null
      ? String(accountToEdit.interestRate)
      : "5.0",
  );
  const [monthlyContribution, setMonthlyContribution] = useState<string>(
    accountToEdit?.monthlyContribution !== undefined && accountToEdit.monthlyContribution !== null
      ? String(accountToEdit.monthlyContribution)
      : "",
  );

  useEffect(() => {
    if (isOpen && accountToEdit) {
      setName(accountToEdit.name || "");
      setBalance(
        accountToEdit.balance !== undefined && accountToEdit.balance !== null
          ? String(accountToEdit.balance)
          : "",
      );
      setInterestRate(
        accountToEdit.interestRate !== undefined && accountToEdit.interestRate !== null
          ? String(accountToEdit.interestRate)
          : "5.0",
      );
      setMonthlyContribution(
        accountToEdit.monthlyContribution !== undefined &&
          accountToEdit.monthlyContribution !== null
          ? String(accountToEdit.monthlyContribution)
          : "",
      );
    } else if (isOpen && !accountToEdit) {
      setName("");
      setBalance("");
      setInterestRate("5.0");
      setMonthlyContribution("");
    }
  }, [isOpen, accountToEdit]);

  const handleSubmit = useCallback(() => {
    if (!name.trim()) return;

    if (isEditing && accountToEdit?.id) {
      fetcher.submit(
        {
          intent: "updatePensionAccount",
          accountId: accountToEdit.id,
          name: name.trim(),
          balance: balance.trim(),
          interestRate: interestRate.trim(),
          monthlyContribution: monthlyContribution.trim(),
        },
        { method: "POST", action: "/app/pension" },
      );
    } else {
      fetcher.submit(
        {
          intent: "createPensionAccount",
          name: name.trim(),
          balance: balance.trim() || "0",
          interestRate: interestRate.trim() || "5.0",
          monthlyContribution: monthlyContribution.trim(),
        },
        { method: "POST", action: "/app/pension" },
      );
    }
    onClose();
  }, [
    name,
    isEditing,
    accountToEdit,
    balance,
    interestRate,
    monthlyContribution,
    fetcher,
    onClose,
  ]);

  const defaultTrigger = (
    <FLPButton size="sm" variant="primary">
      <FaPlus style={{ marginRight: "6px" }} /> Add Pension Pot
    </FLPButton>
  );

  return (
    <FLPModal
      confirmButton={{
        text: isEditing ? "Save Changes" : "Add Pot",
      }}
      disabled={!name.trim()}
      open={isOpen}
      title={isEditing ? "Edit Pension Pot" : "Add Pension Pot"}
      triggerBtn={triggerButton || defaultTrigger}
      onClose={onClose}
      onConfirm={handleSubmit}
    >
      <div style={{ paddingTop: "8px", minWidth: "320px" }}>
        <div className={formGroupStyle}>
          <label htmlFor="pension-account-name">
            <FLPText fontSize="sm" fontWeight="medium">
              Pot / Provider Name
            </FLPText>
          </label>
          <input
            className={inputStyle}
            id="pension-account-name"
            list="pension-provider-suggestions"
            placeholder="e.g. Nest Workplace Pension, Vanguard SIPP"
            required
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <datalist id="pension-provider-suggestions">
            {COMMON_PROVIDERS.map((provider) => (
              <option key={provider} value={provider} />
            ))}
          </datalist>
          <FLPText color="text.muted" fontSize="xs">
            Identify which workplace pension, private pension, or SIPP this pot represents.
          </FLPText>
        </div>

        <div className={rowTwoColStyle}>
          <div className={formGroupStyle}>
            <label htmlFor="pension-balance">
              <FLPText fontSize="sm" fontWeight="medium">
                Current Value (£)
              </FLPText>
            </label>
            <input
              className={inputStyle}
              id="pension-balance"
              min="0"
              placeholder="e.g. 15000"
              required
              step="any"
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
            />
          </div>

          <div className={formGroupStyle}>
            <label htmlFor="pension-growth-rate">
              <FLPText fontSize="sm" fontWeight="medium">
                Expected Return (% p.a.)
              </FLPText>
            </label>
            <input
              className={inputStyle}
              id="pension-growth-rate"
              max="25"
              min="0"
              placeholder="e.g. 5.0"
              step="0.1"
              type="number"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
            />
          </div>
        </div>

        <div className={formGroupStyle}>
          <label htmlFor="pension-monthly-contrib">
            <FLPText fontSize="sm" fontWeight="medium">
              Specific Direct Contribution (£/month, optional)
            </FLPText>
          </label>
          <input
            className={inputStyle}
            id="pension-monthly-contrib"
            min="0"
            placeholder="Leave blank to use salary percentage"
            step="any"
            type="number"
            value={monthlyContribution}
            onChange={(e) => setMonthlyContribution(e.target.value)}
          />
          <FLPText color="text.muted" fontSize="xs">
            If you pay a fixed regular sum into this specific pot (e.g., SIPP direct debit), enter
            it here.
          </FLPText>
        </div>
      </div>
    </FLPModal>
  );
};

export default AddPensionAccountDialog;
