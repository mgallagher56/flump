import { type FC, useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaGlobe,
  FaKey,
  FaPencilAlt,
  FaShieldAlt,
} from "react-icons/fa";
import { useFetcher, useLoaderData, useRevalidator } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPButtonGroup from "~/components/core/buttons/FLPButtonGroup";
import FLPModal from "~/components/core/dialogs/FLPModal";
import FLPInput from "~/components/core/inputs/input/FLPInput";
import FLPSelect from "~/components/core/inputs/select/FLPSelect";
import FLPBox from "~/components/core/structure/FLPBox";
import FLPText from "~/components/core/typography/FLPText";
import { type AccountType, AccountTypeEnum } from "~/containers/accounts/utils";
import type { loader } from "~/routes/app.accounts._index";

const { CURRENT, SAVING, MORTGAGE, CREDIT_CARD, LOAN, OWED, INVESTMENT, PENSION } = AccountTypeEnum;
const accountTypeArray = [CURRENT, SAVING, INVESTMENT, PENSION, CREDIT_CARD, MORTGAGE, LOAN, OWED];
const accountTypes = {
  items: accountTypeArray.map((type) => ({ id: type, name: type })),
};

const POPULAR_BANKS = [
  {
    id: "monzo",
    name: "Monzo Bank",
    color: "#ff4f5e",
    desc: "Current account, joint account & pots",
  },
  {
    id: "starling",
    name: "Starling Bank",
    color: "#00aeef",
    desc: "Current account, joint account & spaces",
  },
];

interface AddEditAccountsDialogBtnProp {
  accountId?: string;
  isEditAccount?: boolean;
  btnSize?: "sm" | "md" | "lg" | "icon";
  isIconButton?: boolean;
}

const AddEditAccountsDialogBtn: FC<AddEditAccountsDialogBtnProp> = ({
  accountId,
  btnSize = "md",
  isEditAccount,
  isIconButton = false,
}) => {
  const {
    accounts = [],
  }: {
    accounts?: { id?: string; name?: string; type?: AccountType; balance?: number }[];
  } = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const contentRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [entryMethod, setEntryMethod] = useState<"manual" | "bank">("manual");
  const [selectedBank, setSelectedBank] = useState<string>("monzo");
  const [bankAuthType, setBankAuthType] = useState<"token" | "oauth">("token");
  const [bankToken, setBankToken] = useState<string>("");
  const [bankError, setBankError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const selectedAccount = useMemo(
    () =>
      accounts?.find(
        (account: { id?: string; name?: string; type?: AccountType; balance?: number }) =>
          account.id === accountId,
      ),
    [accounts, accountId],
  ) ?? { name: "", type: accountTypeArray[0], balance: undefined };

  const [formInput, setFormInput] = useState<{
    name: string;
    type: AccountType[];
    balance: string;
  }>({
    name: selectedAccount.name || "",
    type: [selectedAccount.type || accountTypeArray[0]],
    balance: selectedAccount.balance !== undefined ? String(selectedAccount.balance) : "",
  });

  const handleOpenModal = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      setEntryMethod("manual");
      setSelectedBank("monzo");
      setBankAuthType("token");
      setBankToken("");
      setBankError(null);
      setIsConnecting(false);
      setFormInput({
        name: isEditAccount ? selectedAccount.name || "" : "",
        type: [isEditAccount ? selectedAccount.type || accountTypeArray[0] : accountTypeArray[0]],
        balance:
          isEditAccount && selectedAccount.balance !== undefined
            ? String(selectedAccount.balance)
            : "",
      });
      setModalOpen(true);
    },
    [isEditAccount, selectedAccount.balance, selectedAccount.name, selectedAccount.type],
  );

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setBankError(null);
    setIsConnecting(false);
  }, []);

  const onChangeNameInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setFormInput((prevState) => ({ ...prevState, name: value }));
  }, []);

  const onChangeBalanceInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setFormInput((prevState) => ({ ...prevState, balance: value }));
  }, []);

  const onChangeTypeInput = useCallback((e: { value: string[] }) => {
    setFormInput((prevState) => ({ ...prevState, type: e.value as AccountType[] }));
  }, []);

  const onAddAccount = useCallback(() => {
    const { name, type, balance } = formInput;
    fetcher.submit(
      {
        intent: "create",
        name,
        type: type?.[0] || "",
        ...(balance !== "" ? { balance } : {}),
      },
      { method: "POST" },
    );
    handleCloseModal();
  }, [formInput, fetcher, handleCloseModal]);

  const onConnectBank = useCallback(async () => {
    setBankError(null);
    setIsConnecting(true);

    try {
      const formData = new FormData();
      formData.append("intent", "connectBank");
      formData.append("institutionId", selectedBank);
      if (bankAuthType === "token") {
        if (!bankToken.trim()) {
          setBankError("Please enter your developer token.");
          setIsConnecting(false);
          return;
        }
        formData.append("token", bankToken.trim());
      }

      const res = await fetch("/app/accounts", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || data.message || "Failed to connect bank");
      }

      if (data.oauth && data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }

      revalidator.revalidate();
      handleCloseModal();
    } catch (err) {
      setBankError((err as Error).message);
    } finally {
      setIsConnecting(false);
    }
  }, [bankAuthType, bankToken, handleCloseModal, revalidator, selectedBank]);

  const onEditAccount = useCallback(() => {
    const { name, type, balance } = formInput;
    fetcher.submit(
      {
        intent: "update",
        accountId: accountId || "",
        name,
        type: type?.[0] || "",
        ...(balance !== "" ? { balance } : {}),
      },
      { method: "POST" },
    );
    handleCloseModal();
  }, [accountId, formInput, fetcher, handleCloseModal]);

  const handleRemoveAccount = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      fetcher.submit(
        {
          intent: "delete",
          accountId: accountId || "",
        },
        { method: "POST" },
      );
      handleCloseModal();
    },
    [accountId, fetcher, handleCloseModal],
  );

  const submitAction = useMemo(() => {
    if (isEditAccount) return onEditAccount;
    return entryMethod === "bank" ? onConnectBank : onAddAccount;
  }, [isEditAccount, entryMethod, onConnectBank, onAddAccount, onEditAccount]);

  const selectedBankObj = POPULAR_BANKS.find((b) => b.id === selectedBank);
  const confirmBtnText = isEditAccount
    ? t("save")
    : entryMethod === "bank"
      ? isConnecting
        ? "Connecting..."
        : bankAuthType === "token"
          ? `Connect ${selectedBankObj?.name || "Bank"}`
          : `Authorize via ${selectedBankObj?.name || "Bank"}`
      : t("addAccount");

  return (
    <FLPModal
      additionalActionBtns={
        isEditAccount ? (
          <FLPButtonGroup>
            <FLPButton variant="destructive" onClick={handleRemoveAccount}>
              {t("delete")}
            </FLPButton>
          </FLPButtonGroup>
        ) : undefined
      }
      closeOnConfirm={entryMethod !== "bank"}
      confirmButton={{ id: accountId, text: confirmBtnText }}
      contentRef={contentRef}
      disabled={
        isConnecting || (entryMethod === "bank" && bankAuthType === "token" && !bankToken.trim())
      }
      open={modalOpen}
      title={t(isEditAccount ? "editAccount" : "addAccount")}
      triggerBtn={
        isIconButton ? (
          <FLPButton
            size="icon"
            variant="ghost"
            onClick={handleOpenModal}
            style={{ borderRadius: "50%", width: "32px", height: "32px", padding: 0 }}
          >
            <FaPencilAlt size={12} />
          </FLPButton>
        ) : (
          <FLPButton size={btnSize} variant="outline" onClick={handleOpenModal}>
            {t(isEditAccount ? "edit" : "addAccount")}
          </FLPButton>
        )
      }
      onClose={handleCloseModal}
      onConfirm={submitAction}
    >
      {!isEditAccount && (
        <div
          style={{
            display: "flex",
            backgroundColor: "var(--colors-surface-sunken)",
            border: "1px solid var(--colors-border-subtle)",
            padding: "4px",
            borderRadius: "8px",
            gap: "4px",
            marginBottom: "16px",
          }}
        >
          <button
            type="button"
            onClick={() => setEntryMethod("manual")}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              border: entryMethod === "manual" ? "1px solid var(--colors-border)" : "none",
              backgroundColor: entryMethod === "manual" ? "var(--colors-card)" : "transparent",
              color:
                entryMethod === "manual"
                  ? "var(--colors-text-primary)"
                  : "var(--colors-text-muted)",
              transition: "all 0.15s ease",
            }}
          >
            Manual Entry
          </button>
          <button
            type="button"
            onClick={() => setEntryMethod("bank")}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              border: entryMethod === "bank" ? "1px solid var(--colors-border)" : "none",
              backgroundColor: entryMethod === "bank" ? "var(--colors-card)" : "transparent",
              color:
                entryMethod === "bank" ? "var(--colors-text-primary)" : "var(--colors-text-muted)",
              transition: "all 0.15s ease",
            }}
          >
            Connect to Bank
          </button>
        </div>
      )}

      {entryMethod === "manual" ? (
        <form id={accountId} onSubmit={(e) => e.preventDefault()}>
          <FLPBox display="flex" flexDirection="column" gap={4}>
            <FLPInput
              label="Name"
              name="name"
              placeholder={t("accountName")}
              value={formInput.name}
              onChange={onChangeNameInput}
            />
            <FLPSelect
              collection={accountTypes}
              label="Account Type"
              name="type"
              value={formInput.type}
              onValueChange={onChangeTypeInput}
            />
            <FLPInput
              label="Balance"
              name="balance"
              placeholder="0.00"
              type="number"
              value={formInput.balance}
              onChange={onChangeBalanceInput}
            />
          </FLPBox>
        </form>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px",
              borderRadius: "8px",
              backgroundColor: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
            }}
          >
            <FaShieldAlt color="#10b981" size={14} />
            <FLPText color="text.muted" fontSize="xs">
              FCA regulated Open Banking. 256-bit encrypted read-only connection.
            </FLPText>
          </div>

          <FLPText color="text.muted" fontSize="xs">
            Select your UK financial institution to securely link accounts:
          </FLPText>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "8px",
            }}
          >
            {POPULAR_BANKS.map((bank) => {
              const isSelected = selectedBank === bank.id;
              return (
                <button
                  key={bank.id}
                  type="button"
                  onClick={() => setSelectedBank(bank.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "12px",
                    borderRadius: "8px",
                    border: isSelected
                      ? "2px solid var(--colors-primary)"
                      : "1px solid var(--colors-border-subtle)",
                    backgroundColor: isSelected
                      ? "rgba(99, 99, 241, 0.08)"
                      : "var(--colors-surface)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      backgroundColor: bank.color,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <FLPText fontSize="sm" fontWeight="bold">
                      {bank.name}
                    </FLPText>
                    <FLPText
                      color="text.muted"
                      fontSize="xs"
                      style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                    >
                      {bank.desc}
                    </FLPText>
                  </div>
                  {isSelected && <FaCheckCircle color="var(--colors-primary)" size={14} />}
                </button>
              );
            })}
          </div>

          {/* Connection Method Selection */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginTop: "4px",
              backgroundColor: "var(--colors-surface-sunken)",
              padding: "4px",
              borderRadius: "8px",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setBankAuthType("token");
                setBankError(null);
              }}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "8px 10px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                border: bankAuthType === "token" ? "1px solid var(--colors-border)" : "none",
                backgroundColor: bankAuthType === "token" ? "var(--colors-card)" : "transparent",
                color:
                  bankAuthType === "token"
                    ? "var(--colors-text-primary)"
                    : "var(--colors-text-muted)",
              }}
            >
              <FaKey size={12} />
              Developer Token
            </button>
            <button
              type="button"
              onClick={() => {
                setBankAuthType("oauth");
                setBankError(null);
              }}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "8px 10px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                border: bankAuthType === "oauth" ? "1px solid var(--colors-border)" : "none",
                backgroundColor: bankAuthType === "oauth" ? "var(--colors-card)" : "transparent",
                color:
                  bankAuthType === "oauth"
                    ? "var(--colors-text-primary)"
                    : "var(--colors-text-muted)",
              }}
            >
              <FaGlobe size={12} />
              OAuth Portal
            </button>
          </div>

          {bankAuthType === "token" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
              <FLPInput
                label={
                  selectedBank === "monzo" ? "Monzo Access Token" : "Starling Personal Access Token"
                }
                name="bankToken"
                placeholder={
                  selectedBank === "monzo"
                    ? "Access token from developers.monzo.com..."
                    : "Bearer token starting with eyJ..."
                }
                value={bankToken}
                onChange={(e) => {
                  setBankToken(e.target.value);
                  setBankError(null);
                }}
              />
              <FLPText color="text.muted" fontSize="xs">
                {selectedBank === "monzo"
                  ? "* Sign in at https://developers.monzo.com and copy your access token from the playground."
                  : "* Generate a Personal Access Token in the Starling Developer Console with account:read and balance:read permissions."}
              </FLPText>
            </div>
          ) : (
            <div
              style={{
                padding: "12px",
                borderRadius: "8px",
                backgroundColor: "var(--colors-surface-sunken)",
                border: "1px solid var(--colors-border-subtle)",
              }}
            >
              <FLPText fontSize="xs" color="text.muted">
                Clicking &quot;Authorize via {selectedBankObj?.name}&quot; will redirect you to{" "}
                {selectedBankObj?.name}&apos;s secure login page to grant read-only permissions
                (requires server OAuth client keys configured in your environment).
              </FLPText>
            </div>
          )}

          {bankError && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                padding: "10px 12px",
                borderRadius: "8px",
                backgroundColor: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
              }}
            >
              <FaExclamationTriangle
                color="#ef4444"
                size={14}
                style={{ marginTop: "2px", flexShrink: 0 }}
              />
              <FLPText fontSize="xs" color="destructive">
                {bankError}
              </FLPText>
            </div>
          )}
        </div>
      )}
    </FLPModal>
  );
};

export default AddEditAccountsDialogBtn;
