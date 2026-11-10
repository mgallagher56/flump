import { type FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaGlobe,
  FaKey,
  FaPencilAlt,
  FaShieldAlt,
} from "react-icons/fa";
import { useFetcher, useLoaderData } from "react-router";
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
    desc: "Current, joint & pots",
    directSync: true,
  },
  {
    id: "starling",
    name: "Starling Bank",
    color: "#00aeef",
    desc: "Current, joint & spaces",
    directSync: true,
  },
  {
    id: "hsbc",
    name: "HSBC Bank",
    color: "#db0011",
    desc: "Current & savings",
    directSync: false,
  },
  {
    id: "barclays",
    name: "Barclays",
    color: "#00aeef",
    desc: "Everyday & cards",
    directSync: false,
  },
  {
    id: "revolut",
    name: "Revolut",
    color: "#111118",
    desc: "Multi-currency accounts",
    directSync: false,
  },
  {
    id: "santander",
    name: "Santander",
    color: "#ec0000",
    desc: "123 Current & ISA",
    directSync: false,
  },
  {
    id: "natwest",
    name: "NatWest",
    color: "#4e195b",
    desc: "Select & reward accounts",
    directSync: false,
  },
  {
    id: "lloyds",
    name: "Lloyds Bank",
    color: "#006a4e",
    desc: "Club Lloyds & cards",
    directSync: false,
  },
  {
    id: "chase",
    name: "Chase",
    color: "#112e51",
    desc: "Current & saver accounts",
    directSync: false,
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
  const contentRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [entryMethod, setEntryMethod] = useState<"manual" | "bank">("manual");
  const [selectedBank, setSelectedBank] = useState<string>("monzo");
  const [bankAuthType, setBankAuthType] = useState<"token" | "oauth">("token");
  const [bankToken, setBankToken] = useState<string>("");
  const [bankError, setBankError] = useState<string | null>(null);
  const isConnecting = fetcher.state === "submitting" || fetcher.state === "loading";

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setBankError(null);
  }, []);

  useEffect(() => {
    if (!fetcher.data) return;
    const res = fetcher.data as {
      success?: boolean;
      oauth?: boolean;
      redirectUrl?: string;
      error?: string;
      message?: string;
    };

    if (res.oauth && res.redirectUrl) {
      window.location.href = res.redirectUrl;
      return;
    }

    if (res.error) {
      setBankError(res.error);
      return;
    }

    if (res.success) {
      handleCloseModal();
    }
  }, [fetcher.data, handleCloseModal]);

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

  const onConnectBank = useCallback(() => {
    setBankError(null);
    if (bankAuthType === "token") {
      if (!bankToken.trim()) {
        setBankError("Please enter your developer token.");
        return;
      }
      fetcher.submit(
        {
          intent: "connectBank",
          institutionId: selectedBank,
          token: bankToken.trim(),
        },
        { method: "POST", action: "/app/accounts" },
      );
    } else {
      fetcher.submit(
        {
          intent: "connectBank",
          institutionId: selectedBank,
        },
        { method: "POST", action: "/app/accounts" },
      );
    }
  }, [bankAuthType, bankToken, fetcher, selectedBank]);

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

  const selectedBankObj = POPULAR_BANKS.find((b) => b.id === selectedBank) ?? POPULAR_BANKS[0];
  const isDirectSync = !!selectedBankObj.directSync;

  const onSwitchToManualForBank = useCallback(() => {
    setEntryMethod("manual");
    setFormInput((prev) => ({
      ...prev,
      name: `${selectedBankObj.name} Account`,
    }));
  }, [selectedBankObj.name]);

  const submitAction = useMemo(() => {
    if (isEditAccount) return onEditAccount;
    if (entryMethod === "bank") {
      if (isDirectSync) return onConnectBank;
      return onSwitchToManualForBank;
    }
    return onAddAccount;
  }, [
    isEditAccount,
    entryMethod,
    isDirectSync,
    onConnectBank,
    onSwitchToManualForBank,
    onAddAccount,
    onEditAccount,
  ]);

  const confirmBtnText = isEditAccount
    ? t("save")
    : entryMethod === "bank"
      ? isDirectSync
        ? isConnecting
          ? "Connecting..."
          : bankAuthType === "token"
            ? `Connect ${selectedBankObj?.name || "Bank"}`
            : `Authorize via ${selectedBankObj?.name || "Bank"}`
        : `Track ${selectedBankObj?.name} via Manual Entry`
      : t("addAccount");

  const isConfirmDisabled = useMemo(() => {
    if (isConnecting) return true;
    if (entryMethod === "bank" && isDirectSync && bankAuthType === "token" && !bankToken.trim()) {
      return true;
    }
    return false;
  }, [isConnecting, entryMethod, isDirectSync, bankAuthType, bankToken]);

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
      closeOnConfirm={entryMethod === "manual" || isEditAccount}
      confirmButton={{ id: accountId, text: confirmBtnText }}
      contentRef={contentRef}
      disabled={isConfirmDisabled}
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
            width: "100%",
            minWidth: 0,
            boxSizing: "border-box",
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
              minWidth: 0,
              boxSizing: "border-box",
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
              minWidth: 0,
              boxSizing: "border-box",
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
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            width: "100%",
            minWidth: 0,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px",
              borderRadius: "8px",
              backgroundColor: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              width: "100%",
              minWidth: 0,
              boxSizing: "border-box",
            }}
          >
            <FaShieldAlt color="#10b981" size={14} style={{ flexShrink: 0 }} />
            <FLPText color="text.muted" fontSize="xs">
              FCA regulated Open Banking. 256-bit encrypted read-only connection.
            </FLPText>
          </div>

          <FLPText color="text.muted" fontSize="xs">
            Select your UK financial institution:
          </FLPText>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "8px",
              maxHeight: "220px",
              overflowY: "auto",
              overflowX: "hidden",
              paddingRight: "2px",
              width: "100%",
              minWidth: 0,
              boxSizing: "border-box",
            }}
          >
            {POPULAR_BANKS.map((bank) => {
              const isSelected = selectedBank === bank.id;
              return (
                <button
                  key={bank.id}
                  type="button"
                  onClick={() => {
                    setSelectedBank(bank.id);
                    setBankError(null);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 10px",
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
                    width: "100%",
                    minWidth: 0,
                    boxSizing: "border-box",
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
                  <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", minWidth: 0 }}>
                      <FLPText
                        fontSize="sm"
                        fontWeight="bold"
                        style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {bank.name}
                      </FLPText>
                      {bank.directSync && (
                        <span
                          style={{
                            fontSize: "9px",
                            padding: "1px 4px",
                            borderRadius: "4px",
                            backgroundColor: "rgba(16, 185, 129, 0.15)",
                            color: "#10b981",
                            fontWeight: 700,
                            flexShrink: 0,
                            textTransform: "uppercase",
                            lineHeight: "1.2",
                          }}
                        >
                          Live
                        </span>
                      )}
                    </div>
                    <FLPText
                      color="text.muted"
                      fontSize="xs"
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {bank.desc}
                    </FLPText>
                  </div>
                  {isSelected && (
                    <FaCheckCircle
                      color="var(--colors-primary)"
                      size={14}
                      style={{ flexShrink: 0 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {isDirectSync ? (
            <>
              {/* Connection Method Selection */}
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginTop: "4px",
                  backgroundColor: "var(--colors-surface-sunken)",
                  padding: "4px",
                  borderRadius: "8px",
                  width: "100%",
                  minWidth: 0,
                  boxSizing: "border-box",
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
                    backgroundColor:
                      bankAuthType === "token" ? "var(--colors-card)" : "transparent",
                    color:
                      bankAuthType === "token"
                        ? "var(--colors-text-primary)"
                        : "var(--colors-text-muted)",
                    minWidth: 0,
                    boxSizing: "border-box",
                  }}
                >
                  <FaKey size={12} style={{ flexShrink: 0 }} />
                  <span>Developer Token</span>
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
                    backgroundColor:
                      bankAuthType === "oauth" ? "var(--colors-card)" : "transparent",
                    color:
                      bankAuthType === "oauth"
                        ? "var(--colors-text-primary)"
                        : "var(--colors-text-muted)",
                    minWidth: 0,
                    boxSizing: "border-box",
                  }}
                >
                  <FaGlobe size={12} style={{ flexShrink: 0 }} />
                  <span>OAuth Portal</span>
                </button>
              </div>

              {bankAuthType === "token" ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    marginTop: "4px",
                    width: "100%",
                    minWidth: 0,
                    boxSizing: "border-box",
                  }}
                >
                  <FLPInput
                    label={
                      selectedBank === "monzo"
                        ? "Monzo Access Token"
                        : "Starling Personal Access Token"
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
                    width: "100%",
                    minWidth: 0,
                    boxSizing: "border-box",
                  }}
                >
                  <FLPText fontSize="xs" color="text.muted">
                    Clicking &quot;Authorize via {selectedBankObj?.name}&quot; will redirect you to{" "}
                    {selectedBankObj?.name}&apos;s secure login page to grant read-only permissions
                    (requires server OAuth client keys configured in your environment).
                  </FLPText>
                </div>
              )}
            </>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                padding: "12px 14px",
                borderRadius: "8px",
                backgroundColor: "var(--colors-surface-sunken)",
                border: "1px solid var(--colors-border-subtle)",
                width: "100%",
                minWidth: 0,
                boxSizing: "border-box",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                <FaExclamationTriangle
                  color="var(--colors-text-muted)"
                  size={14}
                  style={{ flexShrink: 0, marginTop: "2px" }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <FLPText fontSize="xs" fontWeight="bold">
                    Direct Sync for {selectedBankObj?.name} coming soon
                  </FLPText>
                  <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "2px" }}>
                    Live Open Banking sync is currently enabled for Monzo and Starling. No dummy
                    data is created. You can record and track {selectedBankObj?.name} balances with
                    manual entry right now.
                  </FLPText>
                </div>
              </div>
              <FLPButton
                size="sm"
                variant="outline"
                onClick={onSwitchToManualForBank}
                style={{ alignSelf: "flex-start" }}
              >
                Track {selectedBankObj?.name} via Manual Entry
              </FLPButton>
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
                width: "100%",
                minWidth: 0,
                boxSizing: "border-box",
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
