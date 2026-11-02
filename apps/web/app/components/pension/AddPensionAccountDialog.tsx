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
  _disabled: {
    opacity: 0.6,
    cursor: "not-allowed",
    backgroundColor: "background",
  },
});

const potTypeBtnStyle = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  padding: "10px 14px",
  borderRadius: "lg",
  border: "1.5px solid",
  borderColor: "border",
  backgroundColor: "surface",
  cursor: "pointer",
  transition: "all 0.15s ease",
  textAlign: "left",
  width: "100%",
  _hover: {
    borderColor: "primary",
  },
});

const potTypeBtnActiveStyle = css({
  borderColor: "primary",
  backgroundColor: "rgba(139, 92, 246, 0.08)",
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
  const [isCurrent, setIsCurrent] = useState<boolean>(accountToEdit?.isCurrent !== false);
  const [monthlyContribution, setMonthlyContribution] = useState<string>(
    accountToEdit?.isCurrent !== false &&
      accountToEdit?.monthlyContribution !== undefined &&
      accountToEdit.monthlyContribution !== null
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
      const isCurr = accountToEdit.isCurrent !== false;
      setIsCurrent(isCurr);
      setMonthlyContribution(
        isCurr &&
          accountToEdit.monthlyContribution !== undefined &&
          accountToEdit.monthlyContribution !== null
          ? String(accountToEdit.monthlyContribution)
          : "",
      );
    } else if (isOpen && !accountToEdit) {
      setName("");
      setBalance("");
      setInterestRate("5.0");
      setIsCurrent(true);
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
          isCurrent: String(isCurrent),
          monthlyContribution: isCurrent ? monthlyContribution.trim() : "",
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
          isCurrent: String(isCurrent),
          monthlyContribution: isCurrent ? monthlyContribution.trim() : "",
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
    isCurrent,
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

        <div className={formGroupStyle}>
          <div id="pot-status-label">
            <FLPText fontSize="sm" fontWeight="medium">
              Pot Status
            </FLPText>
          </div>
          <div
            aria-labelledby="pot-status-label"
            role="radiogroup"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}
          >
            <label
              className={`${potTypeBtnStyle} ${isCurrent ? potTypeBtnActiveStyle : ""}`}
              style={{ cursor: "pointer", position: "relative" }}
            >
              <input
                type="radio"
                name="pot-status"
                value="current"
                checked={isCurrent}
                onChange={() => setIsCurrent(true)}
                style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
              />
              <FLPText
                color={isCurrent ? "primary" : "text.primary"}
                fontSize="sm"
                fontWeight="bold"
              >
                Current Pot
              </FLPText>
              <FLPText color="text.muted" fontSize="xs">
                Active workplace or active SIPP
              </FLPText>
            </label>
            <label
              className={`${potTypeBtnStyle} ${!isCurrent ? potTypeBtnActiveStyle : ""}`}
              style={{ cursor: "pointer", position: "relative" }}
            >
              <input
                type="radio"
                name="pot-status"
                value="past"
                checked={!isCurrent}
                onChange={() => {
                  setIsCurrent(false);
                  setMonthlyContribution("");
                }}
                style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
              />
              <FLPText
                color={!isCurrent ? "primary" : "text.primary"}
                fontSize="sm"
                fontWeight="bold"
              >
                Past Pot
              </FLPText>
              <FLPText color="text.muted" fontSize="xs">
                Previous employer / frozen pot
              </FLPText>
            </label>
          </div>
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
            <FLPText
              color={!isCurrent ? "text.muted" : undefined}
              fontSize="sm"
              fontWeight="medium"
            >
              Specific Direct Contribution (£/month, optional)
            </FLPText>
          </label>
          <input
            className={inputStyle}
            disabled={!isCurrent}
            id="pension-monthly-contrib"
            min="0"
            placeholder={
              !isCurrent
                ? "No direct contributions for past pots"
                : "Leave blank to use salary percentage"
            }
            step="any"
            type="number"
            value={!isCurrent ? "" : monthlyContribution}
            onChange={(e) => setMonthlyContribution(e.target.value)}
          />
          <FLPText color="text.muted" fontSize="xs">
            {!isCurrent
              ? "Past pots from previous employers have no direct or regular contributions. They continue to grow through investment returns."
              : "If you pay a fixed regular sum into this specific pot (e.g., SIPP direct debit), enter it here."}
          </FLPText>
        </div>
      </div>
    </FLPModal>
  );
};

export default AddPensionAccountDialog;
