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
import { isSafeRedirectUrl } from "~/utils/safeRedirectUrl";

// Block-level text for use inside card buttons (a <p> or <div> is not valid button content).
const cardTextStyles = {
  title: css({
    display: "block",
    margin: 0,
    lineHeight: 1.6,
    fontSize: "md",
    fontWeight: "semibold",
    color: "text.secondary",
  }),
  method: css({
    display: "block",
    margin: 0,
    lineHeight: 1.6,
    fontSize: "sm",
    fontWeight: "bold",
    color: "text.secondary",
  }),
  muted: css({ display: "block", margin: 0, lineHeight: 1.6, fontSize: "xs", color: "text.muted" }),
};

const CardText: FC<{
  fontWeight?: "semibold" | "bold";
  fontSize?: "sm" | "xs";
  color?: "text.muted";
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ fontWeight, fontSize, color, style, children }) => {
  const kind =
    color === "text.muted"
      ? "muted"
      : fontSize === "sm" && fontWeight === "bold"
        ? "method"
        : "title";
  return (
    <span className={cardTextStyles[kind]} style={style}>
      {children}
    </span>
  );
};

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
    desc: "Preview: connect via Developer Token or OAuth",
    accounts: ["Monzo Current Account", "Monzo Savings Pots"],
    directSync: true,
  },
  {
    id: "starling",
    name: "Starling Bank",
    color: "#00aeef",
    desc: "Preview: connect via Personal Access Token or OAuth",
    accounts: ["Starling Current Account", "Starling Savings Spaces"],
    directSync: true,
  },
  {
    id: "trading212",
    name: "Trading 212",
    color: "#00aaff",
    desc: "Preview: connect via API Key",
    accounts: ["Trading 212 Portfolio"],
    directSync: true,
  },
  {
    id: "hsbc",
    name: "HSBC Bank",
    color: "#db0011",
    desc: "Preview: paste your own read-only access token",
    accounts: ["HSBC Current Account"],
    directSync: true,
  },
  {
    id: "barclays",
    name: "Barclays Bank",
    color: "#00aeef",
    desc: "Preview: paste your own read-only access token",
    accounts: ["Barclays Everyday Account"],
    directSync: true,
  },
  {
    id: "revolut",
    name: "Revolut",
    color: "#111118",
    desc: "Preview: paste your own read-only access token",
    accounts: ["Revolut Multi-Currency"],
    directSync: true,
  },
  {
    id: "santander",
    name: "Santander",
    color: "#ec0000",
    desc: "Preview: paste your own read-only access token",
    accounts: ["Santander 123 Current"],
    directSync: true,
  },
  {
    id: "natwest",
    name: "NatWest",
    color: "#4e195b",
    desc: "Preview: paste your own read-only access token",
    accounts: ["NatWest Select Current"],
    directSync: true,
  },
  {
    id: "lloyds",
    name: "Lloyds Bank",
    color: "#006a4e",
    desc: "Preview: paste your own read-only access token",
    accounts: ["Lloyds Classic Account"],
    directSync: true,
  },
  {
    id: "chase",
    name: "Chase",
    color: "#112e51",
    desc: "Preview: paste your own read-only access token",
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
      if (!isSafeRedirectUrl(res.redirectUrl)) {
        setErrorMessage("We couldn't start the bank sign-in. Please try again.");
        setStep("error");
        return;
      }
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
    backgroundColor: "color-mix(in srgb, var(--colors-surface-contrast) 60%, transparent)",
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
    boxShadow:
      "0 20px 25px -5px color-mix(in srgb, var(--colors-surface-contrast) 30%, transparent), 0 10px 10px -5px color-mix(in srgb, var(--colors-surface-contrast) 20%, transparent)",
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
    font: "inherit",
    color: "inherit",
    textAlign: "left",
    width: "100%",
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
    font: "inherit",
    color: "inherit",
    textAlign: "left",
    width: "100%",
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
      backgroundColor: "color-mix(in srgb, var(--colors-primary) 4%, transparent)",
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
    color: "status.positive.text",
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
                <Dialog.Title asChild>
                  <FLPHeading as="h2" size="lg">
                    Connect Bank Account
                  </FLPHeading>
                </Dialog.Title>
                <Dialog.Description asChild>
                  <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "4px" }}>
                    Choose your bank or financial institution. Bank connection is a preview.
                  </FLPText>
                </Dialog.Description>
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
                  <button
                    key={bank.id}
                    className={bankCardStyle}
                    type="button"
                    onClick={() => handleSelectBank(bank)}
                  >
                    <span className={flexContainer} style={{ minWidth: 0, flex: 1 }}>
                      <span className={bankLogoCircleStyle(bank.color)}>{bank.name.charAt(0)}</span>
                      <span style={{ display: "block", minWidth: 0, flex: 1, paddingRight: "8px" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <CardText
                            fontWeight="semibold"
                            style={{
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {bank.name}
                          </CardText>
                          {bank.directSync ? (
                            <span
                              style={{
                                fontSize: "9px",
                                padding: "1px 5px",
                                borderRadius: "4px",
                                backgroundColor:
                                  "color-mix(in srgb, var(--colors-chart-wealth) 15%, transparent)",
                                color: "var(--colors-status-positive-text)",
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
                                backgroundColor:
                                  "color-mix(in srgb, var(--colors-chart-baseline) 15%, transparent)",
                                color: "var(--colors-text-muted)",
                                fontWeight: 600,
                                flexShrink: 0,
                              }}
                            >
                              Soon
                            </span>
                          )}
                        </span>
                        <CardText
                          color="text.muted"
                          fontSize="xs"
                          style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {bank.desc}
                        </CardText>
                      </span>
                    </span>
                    <FaChevronRight
                      style={{
                        color: "var(--colors-chart-baseline)",
                        fontSize: "14px",
                        flexShrink: 0,
                      }}
                    />
                  </button>
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
                <Dialog.Title asChild>
                  <FLPHeading as="h2" size="lg">
                    Choose Connection Mode
                  </FLPHeading>
                </Dialog.Title>
                <Dialog.Description asChild>
                  <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "4px" }}>
                    Select how you want to connect to {selectedBank.name}.
                  </FLPText>
                </Dialog.Description>
              </div>

              <div className={scrollContainerStyle}>
                <button
                  className={methodCardStyle}
                  type="button"
                  onClick={() => handleSelectMethod("pat")}
                >
                  <span style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                    <FaKey
                      style={{ color: selectedBank.color, fontSize: "20px", marginTop: "4px" }}
                    />
                    <span style={{ display: "block" }}>
                      <CardText fontWeight="bold" fontSize="sm">
                        Personal Access Token (Recommended)
                      </CardText>
                      <CardText color="text.muted" fontSize="xs" style={{ marginTop: "2px" }}>
                        Preview: paste your own read-only access token from your provider.
                      </CardText>
                    </span>
                  </span>
                </button>

                <button
                  className={methodCardStyle}
                  type="button"
                  onClick={() => handleSelectMethod("oauth")}
                >
                  <span style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                    <FaGlobe
                      style={{ color: selectedBank.color, fontSize: "20px", marginTop: "4px" }}
                    />
                    <span style={{ display: "block" }}>
                      <CardText fontWeight="bold" fontSize="sm">
                        OAuth 2.0 Auth Flow
                      </CardText>
                      <CardText color="text.muted" fontSize="xs" style={{ marginTop: "2px" }}>
                        Redirect to {selectedBank.name}&apos;s secure portal to authorize read-only
                        access (requires server OAuth keys).
                      </CardText>
                    </span>
                  </span>
                </button>
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
                <Dialog.Title asChild>
                  <FLPHeading as="h2" size="lg">
                    {selectedBank.name} Developer Token
                  </FLPHeading>
                </Dialog.Title>
                <Dialog.Description asChild>
                  <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "4px" }}>
                    Preview: paste your own read-only access token from your provider.
                  </FLPText>
                </Dialog.Description>
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
                          : "Read-only access token..."
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
                          : `* Paste a read-only access token from ${selectedBank.name}, or go back and choose the OAuth flow.`}
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
                <Dialog.Title asChild>
                  <FLPHeading as="h2" size="lg">
                    Link with {selectedBank.name}
                  </FLPHeading>
                </Dialog.Title>
                <Dialog.Description asChild>
                  <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "4px" }}>
                    Review the secure sync authorizations requested.
                  </FLPText>
                </Dialog.Description>
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
                      Bank connection (preview)
                    </FLPText>
                  </div>
                </div>

                <FLPText fontSize="sm" fontWeight="medium">
                  By continuing, you authorize Flump to retrieve:
                </FLPText>

                <div className={bulletListStyle}>
                  <div className={bulletItemStyle}>
                    <FaShieldAlt
                      style={{ color: "var(--colors-primary)", marginTop: "3px", flexShrink: 0 }}
                    />
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
                    <FaUniversity
                      style={{ color: "var(--colors-primary)", marginTop: "3px", flexShrink: 0 }}
                    />
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
                    <FaLock
                      style={{ color: "var(--colors-primary)", marginTop: "3px", flexShrink: 0 }}
                    />
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
                <Dialog.Title asChild>
                  <FLPHeading as="h3" size="md">
                    Connecting to {selectedBank.name}
                  </FLPHeading>
                </Dialog.Title>
                <Dialog.Description asChild>
                  <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "4px" }}>
                    Establishing secure API link & parsing balances...
                  </FLPText>
                </Dialog.Description>
              </div>
            </div>
          )}

          {/* Step 6: Success */}
          {step === "success" && selectedBank && (
            <>
              <div className={loadingContainer}>
                <FaCheckCircle className={successCheckStyle} />
                <div style={{ textAlign: "center" }}>
                  <Dialog.Title asChild>
                    <FLPHeading as="h3" size="md">
                      Successfully Connected!
                    </FLPHeading>
                  </Dialog.Title>
                  <Dialog.Description asChild>
                    <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "4px" }}>
                      Your accounts from {selectedBank.name} are now synced.
                    </FLPText>
                  </Dialog.Description>
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
                      <FaUniversity style={{ color: "var(--colors-primary)" }} />
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
                <div style={{ fontSize: "48px", color: "var(--colors-status-danger-text)" }}>⚠️</div>
                <div style={{ textAlign: "center" }}>
                  <Dialog.Title asChild>
                    <FLPHeading as="h3" size="md" color="status.danger.text">
                      Connection Failed
                    </FLPHeading>
                  </Dialog.Title>
                  <Dialog.Description asChild>
                    <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "4px" }}>
                      We couldn't connect to {selectedBank.name} API.
                    </FLPText>
                  </Dialog.Description>
                </div>
              </div>

              <div className={scrollContainerStyle}>
                <div
                  className={css({
                    backgroundColor:
                      "color-mix(in srgb, var(--colors-status-danger-text) 5%, transparent)",
                    border: "1px solid",
                    borderColor: "destructive",
                    borderRadius: "md",
                    padding: "16px",
                  })}
                >
                  <FLPText
                    fontSize="xs"
                    fontWeight="bold"
                    color="status.danger.text"
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
                <Dialog.Title asChild>
                  <FLPHeading as="h2" size="lg">
                    {selectedBank.name}: bank connection
                  </FLPHeading>
                </Dialog.Title>
                <Dialog.Description asChild>
                  <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "4px" }}>
                    Bank connection coming soon.
                  </FLPText>
                </Dialog.Description>
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
                    color="var(--colors-chart-wealth)"
                    size={18}
                    style={{ flexShrink: 0, marginTop: "2px" }}
                  />
                  <FLPText fontSize="sm">
                    Bank connection is in preview and does not create mock accounts. You can try it
                    with <strong>Monzo</strong> and <strong>Starling Bank</strong> using your own
                    read-only access token.
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
