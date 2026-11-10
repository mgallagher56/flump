import * as Dialog from "@radix-ui/react-dialog";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useEffect, useMemo, useState } from "react";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaChevronRight,
  FaGlobe,
  FaKey,
  FaLock,
  FaShieldAlt,
  FaSpinner,
  FaUniversity,
} from "react-icons/fa";
import { useFetcher } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPInput from "~/components/core/inputs/input/FLPInput";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";

interface ConnectBankWizardProps {
  onSuccess?: () => void;
}

interface BankItem {
  id: string;
  name: string;
  color: string;
  desc: string;
  accounts: string[];
  directSync?: boolean;
}

const BANKS: BankItem[] = [
  {
    id: "monzo",
    name: "Monzo Bank",
    color: "#ff4f5e",
    desc: "Sync real checking, joint & savings pots via Developer Token or OAuth",
    accounts: ["Monzo Current Account", "Monzo Savings Pots"],
    directSync: true,
  },
  {
    id: "starling",
    name: "Starling Bank",
    color: "#00aeef",
    desc: "Sync real accounts & savings spaces via Personal Access Token or OAuth",
    accounts: ["Starling Current Account", "Starling Savings Spaces"],
    directSync: true,
  },
  {
    id: "trading212",
    name: "Trading 212",
    color: "#00aaff",
    desc: "Sync real Invest, Stocks ISA & CFD portfolio via API Key",
    accounts: ["Trading 212 Portfolio"],
    directSync: true,
  },
  {
    id: "hsbc",
    name: "HSBC Bank",
    color: "#db0011",
    desc: "Sync real accounts via Open Banking Token or OAuth",
    accounts: ["HSBC Current Account"],
    directSync: true,
  },
  {
    id: "barclays",
    name: "Barclays Bank",
    color: "#00aeef",
    desc: "Sync real accounts via Open Banking Token or OAuth",
    accounts: ["Barclays Everyday Account"],
    directSync: true,
  },
  {
    id: "revolut",
    name: "Revolut",
    color: "#111118",
    desc: "Sync real accounts via Open Banking Token or OAuth",
    accounts: ["Revolut Multi-Currency"],
    directSync: true,
  },
  {
    id: "santander",
    name: "Santander",
    color: "#ec0000",
    desc: "Sync real accounts via Open Banking Token or OAuth",
    accounts: ["Santander 123 Current"],
    directSync: true,
  },
  {
    id: "natwest",
    name: "NatWest",
    color: "#4e195b",
    desc: "Sync real accounts via Open Banking Token or OAuth",
    accounts: ["NatWest Select Current"],
    directSync: true,
  },
  {
    id: "lloyds",
    name: "Lloyds Bank",
    color: "#006a4e",
    desc: "Sync real accounts via Open Banking Token or OAuth",
    accounts: ["Lloyds Classic Account"],
    directSync: true,
  },
  {
    id: "chase",
    name: "Chase",
    color: "#112e51",
    desc: "Sync real accounts via Open Banking Token or OAuth",
    accounts: ["Chase Current Account"],
    directSync: true,
  },
];

type WizardStep =
  | "select"
  | "method"
  | "tokenInput"
  | "consent"
  | "syncing"
  | "success"
  | "error"
  | "unsupported";

const ConnectBankWizard: FC<ConnectBankWizardProps> = ({ onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>("select");
  const [selectedBank, setSelectedBank] = useState<BankItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Connection choices
  const [authType, setAuthType] = useState<"pat" | "oauth">("pat");
  const [tokenInput, setTokenInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [importedCount, setImportedCount] = useState(0);
  const fetcher = useFetcher();

  const filteredBanks = useMemo(() => {
    return BANKS.filter((bank) => bank.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery]);

  useEffect(() => {
    if (!fetcher.data) return;
    const res = fetcher.data as {
      success?: boolean;
      oauth?: boolean;
      redirectUrl?: string;
      error?: string;
      message?: string;
      accountsCount?: number;
    };

    if (res.oauth && res.redirectUrl) {
      window.location.href = res.redirectUrl;
      return;
    }

    if (res.error) {
      setErrorMessage(res.error);
      setStep("error");
      return;
    }

    if (authType === "oauth" && !res.redirectUrl) {
      setErrorMessage(
        res.message ||
          "Could not initialize OAuth redirect for this institution. Please use Developer Token.",
      );
      setStep("error");
      return;
    }

    if (res.success) {
      setImportedCount(res.accountsCount || selectedBank?.accounts.length || 1);
      setStep("success");
      onSuccess?.();
    }
  }, [fetcher.data, onSuccess, selectedBank]);

  const handleOpenModal = () => {
    setStep("select");
    setSelectedBank(null);
    setSearchQuery("");
    setTokenInput("");
    setErrorMessage("");
    setOpen(true);
  };

  const handleCloseModal = () => {
    setOpen(false);
  };

  const handleSelectBank = (bank: BankItem) => {
    setSelectedBank(bank);
    if (bank.directSync === false) {
      setStep("unsupported");
    } else {
      setStep("method");
    }
  };

  const handleSelectMethod = (selectedType: "pat" | "oauth") => {
    setAuthType(selectedType);
    if (selectedType === "pat") {
      setStep("tokenInput");
    } else {
      setStep("consent");
    }
  };

  const handleConnectWithToken = () => {
    if (!selectedBank || !tokenInput.trim()) return;
    setStep("syncing");

    fetcher.submit(
      {
        intent: "connectBank",
        institutionId: selectedBank.id,
        token: tokenInput.trim(),
      },
      { method: "POST", action: "/app/accounts" },
    );
  };

  const handleAuthorize = () => {
    if (!selectedBank) return;
    setStep("syncing");

    fetcher.submit(
      {
        intent: "connectBank",
        institutionId: selectedBank.id,
        authType: "oauth",
      },
      { method: "POST", action: "/app/accounts" },
    );
  };

  // Styles
  const overlayStyle = css({
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    backdropFilter: "blur(4px)",
    zIndex: 50,
  });

  const contentStyle = css({
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    backgroundColor: "surface",
    border: "1px solid",
    borderColor: "border",
    borderRadius: { base: "xl", md: "lg" },
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
    padding: { base: "18px 14px", md: "24px" },
    width: { base: "calc(100vw - 20px)", sm: "90vw" },
    maxWidth: { base: "calc(100vw - 20px)", md: "520px" },
    zIndex: 50,
    outline: "none",
    color: "text.primary",
    display: "flex",
    flexDirection: "column",
    maxHeight: { base: "94vh", md: "85vh" },
    overflowX: "hidden",
    boxSizing: "border-box",
  });

  const scrollContainerStyle = css({
    overflowY: "auto",
    paddingRight: "4px",
    marginTop: "16px",
    marginBottom: "16px",
    flex: 1,
  });

  const bankCardStyle = css({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px",
    borderRadius: "md",
    border: "1px solid",
    borderColor: "border",
    backgroundColor: "surface",
    cursor: "pointer",
    marginBottom: "12px",
    transition: "transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
    _hover: {
      transform: "translateY(-1px)",
      borderColor: "primary",
      boxShadow: "xs",
    },
  });

  const methodCardStyle = css({
    padding: "16px",
    borderRadius: "lg",
    border: "1px solid",
    borderColor: "border",
    backgroundColor: "surface",
    cursor: "pointer",
    marginBottom: "16px",
    transition: "all 0.2s",
    _hover: {
      borderColor: "primary",
      backgroundColor: "rgba(99, 99, 241, 0.04)",
      transform: "translateY(-1px)",
    },
  });

  const bankLogoCircleStyle = (color: string) =>
    css({
      width: "40px",
      height: "40px",
      borderRadius: "full",
      backgroundColor: color,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "white",
      fontWeight: "bold",
      fontSize: "md",
      flexShrink: 0,
    });

  const flexContainer = css({
    display: "flex",
    alignItems: "center",
    gap: "16px",
  });

  const loadingContainer = css({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 0",
    gap: "20px",
  });

  const successCheckStyle = css({
    color: "success.500",
    fontSize: "48px",
    animation: "pulse 2s infinite",
  });

  const bulletListStyle = css({
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginTop: "20px",
    backgroundColor: "background",
    padding: "16px",
    borderRadius: "md",
    border: "1px solid",
    borderColor: "border",
  });

  const bulletItemStyle = css({
    display: "flex",
    gap: "12px",
    fontSize: "sm",
    color: "text.primary",
  });

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && handleCloseModal()}>
      <Dialog.Trigger asChild>
        <FLPButton onClick={handleOpenModal} variant="primary">
          <FaUniversity style={{ marginRight: "8px" }} />
          Connect Bank Account
        </FLPButton>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={overlayStyle} />
        <Dialog.Content className={contentStyle}>
          {/* Step 1: Select Bank */}
          {step === "select" && (
            <>
              <div>
                <FLPHeading as="h2" size="lg">
                  Connect Bank Account
                </FLPHeading>
                <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "4px" }}>
                  Choose your bank or financial institution to automatically sync your balances.
                </FLPText>
              </div>

              <div style={{ marginTop: "16px" }}>
                <FLPInput
                  label=""
                  name="search"
                  placeholder="Search your bank..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className={scrollContainerStyle}>
                {filteredBanks.map((bank) => (
                  <div
                    key={bank.id}
                    className={bankCardStyle}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectBank(bank)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleSelectBank(bank);
                      }
                    }}
                  >
                    <div className={flexContainer} style={{ minWidth: 0, flex: 1 }}>
                      <div className={bankLogoCircleStyle(bank.color)}>{bank.name.charAt(0)}</div>
                      <div style={{ minWidth: 0, flex: 1, paddingRight: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <FLPText
                            fontWeight="semibold"
                            style={{
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {bank.name}
                          </FLPText>
                          {bank.directSync ? (
                            <span
                              style={{
                                fontSize: "9px",
                                padding: "1px 5px",
                                borderRadius: "4px",
                                backgroundColor: "rgba(16, 185, 129, 0.15)",
                                color: "#10b981",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                flexShrink: 0,
                              }}
                            >
                              Live
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: "9px",
                                padding: "1px 5px",
                                borderRadius: "4px",
                                backgroundColor: "rgba(156, 163, 175, 0.15)",
                                color: "var(--colors-text-muted)",
                                fontWeight: 600,
                                flexShrink: 0,
                              }}
                            >
                              Soon
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
                    </div>
                    <FaChevronRight style={{ color: "#a1a1aa", fontSize: "14px", flexShrink: 0 }} />
                  </div>
                ))}
                {filteredBanks.length === 0 && (
                  <div style={{ textAlign: "center", padding: "32px 0" }}>
                    <FLPText color="text.muted">No banks match your search.</FLPText>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
                <FLPButton variant="outline" onClick={handleCloseModal}>
                  Cancel
                </FLPButton>
              </div>
            </>
          )}

          {/* Step 2: Connection Method Selection */}
          {step === "method" && selectedBank && (
            <>
              <div>
                <FLPHeading as="h2" size="lg">
                  Choose Connection Mode
                </FLPHeading>
                <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "4px" }}>
                  Select how you want to connect to {selectedBank.name}.
                </FLPText>
              </div>

              <div className={scrollContainerStyle}>
                <div
                  className={methodCardStyle}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectMethod("pat")}
                  onKeyDown={(e) =>
                    (e.key === "Enter" || e.key === " ") && handleSelectMethod("pat")
                  }
                >
                  <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                    <FaKey
                      style={{ color: selectedBank.color, fontSize: "20px", marginTop: "4px" }}
                    />
                    <div>
                      <FLPText fontWeight="bold" fontSize="sm">
                        Personal Access Token (Recommended)
                      </FLPText>
                      <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "2px" }}>
                        {selectedBank.id === "monzo"
                          ? "Use an access token from the Monzo Developer Portal for instant direct sync."
                          : "Paste your developer token from the Starling Developer Console to sync directly."}
                      </FLPText>
                    </div>
                  </div>
                </div>

                <div
                  className={methodCardStyle}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectMethod("oauth")}
                  onKeyDown={(e) =>
                    (e.key === "Enter" || e.key === " ") && handleSelectMethod("oauth")
                  }
                >
                  <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                    <FaGlobe
                      style={{ color: selectedBank.color, fontSize: "20px", marginTop: "4px" }}
                    />
                    <div>
                      <FLPText fontWeight="bold" fontSize="sm">
                        OAuth 2.0 Auth Flow
                      </FLPText>
                      <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "2px" }}>
                        Redirect to {selectedBank.name}&apos;s secure portal to authorize read-only
                        access (requires server OAuth keys).
                      </FLPText>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-start", marginTop: "12px" }}>
                <FLPButton variant="outline" onClick={() => setStep("select")}>
                  <FaArrowLeft style={{ marginRight: "6px" }} />
                  Back
                </FLPButton>
              </div>
            </>
          )}

          {/* Step 3: Developer / Personal Token Input */}
          {step === "tokenInput" && selectedBank && (
            <>
              <div>
                <FLPHeading as="h2" size="lg">
                  {selectedBank.name} Developer Token
                </FLPHeading>
                <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "4px" }}>
                  {selectedBank.id === "monzo"
                    ? "Generate a temporary Access Token from developers.monzo.com"
                    : selectedBank.id === "starling"
                      ? "Generate a Personal Access Token in the Starling Developer Portal"
                      : selectedBank.id === "trading212"
                        ? "Generate an API Key in the Trading 212 app under Settings -> API"
                        : `Enter your ${selectedBank.name} Open Banking Access Token`}
                </FLPText>
              </div>

              <div className={scrollContainerStyle}>
                <FLPInput
                  label={
                    selectedBank.id === "trading212"
                      ? "Trading 212 API Key"
                      : "Developer Access Token"
                  }
                  name="token"
                  placeholder={
                    selectedBank.id === "monzo"
                      ? "Monzo access token (e.g. eyJ...)"
                      : selectedBank.id === "starling"
                        ? "Starling Bearer token starting with eyJ..."
                        : selectedBank.id === "trading212"
                          ? "Trading 212 API key..."
                          : "Open Banking access token or AISP bearer token..."
                  }
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                />
                <div style={{ marginTop: "16px" }}>
                  <FLPText color="text.muted" fontSize="xs">
                    {selectedBank.id === "monzo"
                      ? "* Sign in with your Monzo email at https://developers.monzo.com and copy your access token from the playground."
                      : selectedBank.id === "starling"
                        ? "* Make sure your token has permissions account:read and balance:read configured in the Starling Developer Portal."
                        : selectedBank.id === "trading212"
                          ? "* In the Trading 212 app, navigate to Settings -> API -> Generate API key and copy it here."
                          : `* Enter an Open Banking AISP access token or return to choose OAuth 2.0 to authorize directly with ${selectedBank.name}.`}
                  </FLPText>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "12px",
                  gap: "16px",
                }}
              >
                <FLPButton variant="outline" onClick={() => setStep("method")}>
                  Back
                </FLPButton>
                <FLPButton
                  disabled={!tokenInput.trim()}
                  onClick={handleConnectWithToken}
                  variant="primary"
                >
                  Connect & Sync
                </FLPButton>
              </div>
            </>
          )}

          {/* Step 4: Consent Form */}
          {step === "consent" && selectedBank && (
            <>
              <div>
                <FLPHeading as="h2" size="lg">
                  Link with {selectedBank.name}
                </FLPHeading>
                <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "4px" }}>
                  Review the secure sync authorizations requested.
                </FLPText>
              </div>

              <div className={scrollContainerStyle}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    marginBottom: "20px",
                  }}
                >
                  <div className={bankLogoCircleStyle(selectedBank.color)}>
                    {selectedBank.name.charAt(0)}
                  </div>
                  <div>
                    <FLPText fontWeight="bold" fontSize="md">
                      {selectedBank.name}
                    </FLPText>
                    <FLPText color="text.muted" fontSize="xs">
                      Secure Open Banking API Connection
                    </FLPText>
                  </div>
                </div>

                <FLPText fontSize="sm" fontWeight="medium">
                  By continuing, you authorize Flump to retrieve:
                </FLPText>

                <div className={bulletListStyle}>
                  <div className={bulletItemStyle}>
                    <FaShieldAlt style={{ color: "#6363f1", marginTop: "3px", flexShrink: 0 }} />
                    <div>
                      <FLPText fontWeight="semibold" fontSize="sm">
                        Account Overview
                      </FLPText>
                      <FLPText color="text.muted" fontSize="xs">
                        Retrieve account names, currencies, and sub-spaces.
                      </FLPText>
                    </div>
                  </div>
                  <div className={bulletItemStyle}>
                    <FaUniversity style={{ color: "#6363f1", marginTop: "3px", flexShrink: 0 }} />
                    <div>
                      <FLPText fontWeight="semibold" fontSize="sm">
                        Balances & Transactions
                      </FLPText>
                      <FLPText color="text.muted" fontSize="xs">
                        Fetch current amounts and your transaction history.
                      </FLPText>
                    </div>
                  </div>
                  <div className={bulletItemStyle}>
                    <FaLock style={{ color: "#6363f1", marginTop: "3px", flexShrink: 0 }} />
                    <div>
                      <FLPText fontWeight="semibold" fontSize="sm">
                        Read-Only Access
                      </FLPText>
                      <FLPText color="text.muted" fontSize="xs">
                        Flump cannot transfer funds or modify bank settings.
                      </FLPText>
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "12px",
                  gap: "16px",
                }}
              >
                <FLPButton variant="outline" onClick={() => setStep("method")}>
                  Back
                </FLPButton>
                <FLPButton onClick={handleAuthorize} variant="primary">
                  Redirect to Authorize
                </FLPButton>
              </div>
            </>
          )}

          {/* Step 5: Syncing Loading */}
          {step === "syncing" && selectedBank && (
            <div className={loadingContainer}>
              <FaSpinner
                className={css({
                  animation: "spin 1s linear infinite",
                  color: "primary",
                  fontSize: "40px",
                })}
              />
              <div style={{ textAlign: "center" }}>
                <FLPHeading as="h3" size="md">
                  Connecting to {selectedBank.name}
                </FLPHeading>
                <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "4px" }}>
                  Establishing secure API link & parsing balances...
                </FLPText>
              </div>
            </div>
          )}

          {/* Step 6: Success */}
          {step === "success" && selectedBank && (
            <>
              <div className={loadingContainer}>
                <FaCheckCircle className={successCheckStyle} />
                <div style={{ textAlign: "center" }}>
                  <FLPHeading as="h3" size="md">
                    Successfully Connected!
                  </FLPHeading>
                  <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "4px" }}>
                    Your accounts from {selectedBank.name} are now synced.
                  </FLPText>
                </div>
              </div>

              <div className={scrollContainerStyle}>
                <FLPText
                  fontSize="xs"
                  fontWeight="semibold"
                  textTransform="uppercase"
                  color="text.muted"
                  style={{ marginBottom: "8px" }}
                >
                  Imported Assets:
                </FLPText>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {selectedBank.accounts.slice(0, importedCount).map((accName) => (
                    <div
                      key={accName}
                      className={css({
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "12px",
                        borderRadius: "md",
                        backgroundColor: "background",
                        border: "1px solid",
                        borderColor: "border",
                      })}
                    >
                      <FaUniversity style={{ color: "#6363f1" }} />
                      <FLPText fontSize="sm" fontWeight="medium">
                        {accName}
                      </FLPText>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "center", marginTop: "12px" }}>
                <FLPButton variant="primary" onClick={handleCloseModal}>
                  Done
                </FLPButton>
              </div>
            </>
          )}

          {/* Step 7: Error State */}
          {step === "error" && selectedBank && (
            <>
              <div className={loadingContainer}>
                <div style={{ fontSize: "48px", color: "#ef4444" }}>⚠️</div>
                <div style={{ textAlign: "center" }}>
                  <FLPHeading as="h3" size="md" color="destructive">
                    Connection Failed
                  </FLPHeading>
                  <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "4px" }}>
                    We couldn't connect to {selectedBank.name} API.
                  </FLPText>
                </div>
              </div>

              <div className={scrollContainerStyle}>
                <div
                  className={css({
                    backgroundColor: "rgba(239, 68, 68, 0.05)",
                    border: "1px solid",
                    borderColor: "destructive",
                    borderRadius: "md",
                    padding: "16px",
                  })}
                >
                  <FLPText
                    fontSize="xs"
                    fontWeight="bold"
                    color="destructive"
                    textTransform="uppercase"
                    style={{ marginBottom: "4px" }}
                  >
                    Error Message:
                  </FLPText>
                  <FLPText fontSize="sm" style={{ fontFamily: "monospace" }}>
                    {errorMessage ||
                      "Check your credentials or server environment configuration (.env)."}
                  </FLPText>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "center", marginTop: "12px" }}>
                <FLPButton variant="outline" onClick={() => setStep("method")}>
                  Try Again
                </FLPButton>
              </div>
            </>
          )}

          {/* Step 8: Unsupported Bank State */}
          {step === "unsupported" && selectedBank && (
            <>
              <div>
                <FLPHeading as="h2" size="lg">
                  {selectedBank.name} Direct Sync
                </FLPHeading>
                <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "4px" }}>
                  Direct live connection coming soon.
                </FLPText>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  padding: "16px",
                  borderRadius: "8px",
                  backgroundColor: "var(--colors-surface-sunken)",
                  border: "1px solid var(--colors-border-subtle)",
                  marginTop: "20px",
                  marginBottom: "20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <FaShieldAlt
                    color="#10b981"
                    size={18}
                    style={{ flexShrink: 0, marginTop: "2px" }}
                  />
                  <FLPText fontSize="sm">
                    Flump connects directly to real Open Banking APIs and does not create mock
                    accounts. Direct live sync is currently supported for <strong>Monzo</strong> and{" "}
                    <strong>Starling Bank</strong>.
                  </FLPText>
                </div>
                <FLPText color="text.muted" fontSize="xs">
                  To track your {selectedBank.name} accounts now, use the{" "}
                  <strong>Manual Entry</strong> option in the Add Account dialog.
                </FLPText>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "auto",
                  gap: "12px",
                }}
              >
                <FLPButton variant="outline" onClick={() => setStep("select")}>
                  <FaArrowLeft style={{ marginRight: "8px" }} />
                  Back to Banks
                </FLPButton>
                <FLPButton variant="primary" onClick={handleCloseModal}>
                  Close
                </FLPButton>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default ConnectBankWizard;
