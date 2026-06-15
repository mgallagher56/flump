import * as Dialog from "@radix-ui/react-dialog";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useMemo, useState } from "react";
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
}

const BANKS: BankItem[] = [
  {
    id: "monzo",
    name: "Monzo Bank",
    color: "#ff4f5e",
    desc: "Sync real pots & transactions, or run simulation",
    accounts: ["Monzo Current Account", "Monzo Joint Account", "Savings Pot"],
  },
  {
    id: "starling",
    name: "Starling Bank",
    color: "#00aeef",
    desc: "Sync via Personal Token or standard OAuth",
    accounts: ["Starling Current Account", "Starling Joint Account", "Savings Spaces"],
  },
  {
    id: "hsbc",
    name: "HSBC Bank",
    color: "#db0011",
    desc: "Checking, savings & mortgage accounts (Demo)",
    accounts: ["HSBC Premier Checking", "HSBC Flexi Savings", "HSBC Fixed Mortgage"],
  },
  {
    id: "barclays",
    name: "Barclays Bank",
    color: "#00aeef",
    desc: "Everyday accounts & Platinum credit cards (Demo)",
    accounts: ["Barclays Everyday Checking", "Barclays Platinum Credit Card"],
  },
  {
    id: "chase",
    name: "Chase",
    color: "#112e51",
    desc: "Checking & high yield savings (Demo)",
    accounts: ["Chase Checking", "Chase Saver"],
  },
  {
    id: "revolut",
    name: "Revolut",
    color: "#000000",
    desc: "Multicurrency vaults & card accounts (Demo)",
    accounts: ["Revolut Card Account", "Revolut Savings Vault"],
  },
  {
    id: "fidelity",
    name: "Fidelity Investments",
    color: "#008a00",
    desc: "Brokerage & retirement portfolios (Demo)",
    accounts: ["Fidelity Brokerage"],
  },
  {
    id: "vanguard",
    name: "Vanguard",
    color: "#a8201a",
    desc: "Index funds, ISAs & mutual investments (Demo)",
    accounts: ["Vanguard ISA"],
  },
];

type WizardStep = "select" | "method" | "tokenInput" | "consent" | "syncing" | "success" | "error";

const ConnectBankWizard: FC<ConnectBankWizardProps> = ({ onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>("select");
  const [selectedBank, setSelectedBank] = useState<BankItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Connection choices
  const [connMode, setConnMode] = useState<"demo" | "api">("demo");
  const [starlingAuthType, setStarlingAuthType] = useState<"pat" | "oauth">("pat");
  const [tokenInput, setTokenInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [importedCount, setImportedCount] = useState(0);

  const filteredBanks = useMemo(() => {
    return BANKS.filter((bank) => bank.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery]);

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
    // If Monzo or Starling, go to connection method selection. Otherwise, go straight to Demo consent.
    if (bank.id === "monzo" || bank.id === "starling") {
      setStep("method");
    } else {
      setConnMode("demo");
      setStep("consent");
    }
  };

  const handleSelectMethod = (mode: "demo" | "api", authType: "pat" | "oauth" = "oauth") => {
    setConnMode(mode);
    setStarlingAuthType(authType);

    if (mode === "demo") {
      setStep("consent");
    } else {
      if (selectedBank?.id === "starling" && authType === "pat") {
        setStep("tokenInput");
      } else {
        setStep("consent");
      }
    }
  };

  const handleConnectWithToken = async () => {
    if (!selectedBank || !tokenInput.trim()) return;
    setStep("syncing");

    const apiUrl = (window as any).ENV?.VITE_API_URL || "http://localhost:4000";
    const sessionToken = "mock-session-token";

    try {
      const res = await fetch(`${apiUrl}/bank-connections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          institutionId: selectedBank.id,
          token: tokenInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to authenticate Token");
      }

      // Sync success
      setImportedCount(2); // starling standard imported accounts
      setStep("success");
      onSuccess?.();
    } catch (err) {
      setErrorMessage((err as Error).message);
      setStep("error");
    }
  };

  const handleAuthorize = async () => {
    if (!selectedBank) return;
    setStep("syncing");

    const apiUrl = (window as any).ENV?.VITE_API_URL || "http://localhost:4000";
    const sessionToken = "mock-session-token";

    try {
      const res = await fetch(`${apiUrl}/bank-connections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          institutionId: selectedBank.id,
          // note: token connection handled by handleConnectWithToken
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Sync request failed");
      }

      // Check if server resolved real OAuth redirect url
      if (data.oauth && data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }

      // If mock connection succeeded
      setImportedCount(selectedBank.accounts.length);
      setStep("success");
      onSuccess?.();
    } catch (err) {
      setErrorMessage((err as Error).message);
      setStep("error");
    }
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
    borderRadius: "lg",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
    padding: "24px",
    width: "90vw",
    maxWidth: "520px",
    zIndex: 50,
    outline: "none",
    color: "text.primary",
    display: "flex",
    flexDirection: "column",
    maxHeight: "85vh",
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
                    <div className={flexContainer}>
                      <div className={bankLogoCircleStyle(bank.color)}>{bank.name.charAt(0)}</div>
                      <div>
                        <FLPText fontWeight="semibold">{bank.name}</FLPText>
                        <FLPText color="text.muted" fontSize="xs">
                          {bank.desc}
                        </FLPText>
                      </div>
                    </div>
                    <FaChevronRight style={{ color: "#a1a1aa", fontSize: "14px" }} />
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
                {/* Option 1: Live API (PAT for Starling, OAuth for Monzo) */}
                {selectedBank.id === "starling" && (
                  <>
                    <div
                      className={methodCardStyle}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectMethod("api", "pat")}
                      onKeyDown={(e) =>
                        (e.key === "Enter" || e.key === " ") && handleSelectMethod("api", "pat")
                      }
                    >
                      <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                        <FaKey style={{ color: "#00aeef", fontSize: "20px", marginTop: "4px" }} />
                        <div>
                          <FLPText fontWeight="bold" fontSize="sm">
                            Personal Access Token (Recommended)
                          </FLPText>
                          <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "2px" }}>
                            Paste a developer token to sync your personal balances without
                            configuring OAuth keys.
                          </FLPText>
                        </div>
                      </div>
                    </div>

                    <div
                      className={methodCardStyle}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectMethod("api", "oauth")}
                      onKeyDown={(e) =>
                        (e.key === "Enter" || e.key === " ") && handleSelectMethod("api", "oauth")
                      }
                    >
                      <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                        <FaGlobe style={{ color: "#00aeef", fontSize: "20px", marginTop: "4px" }} />
                        <div>
                          <FLPText fontWeight="bold" fontSize="sm">
                            OAuth 2.0 Auth Flow
                          </FLPText>
                          <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "2px" }}>
                            Redirect to Starling's portal to securely authorize. (Requires
                            registered Client Keys).
                          </FLPText>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {selectedBank.id === "monzo" && (
                  <div
                    className={methodCardStyle}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectMethod("api", "oauth")}
                    onKeyDown={(e) =>
                      (e.key === "Enter" || e.key === " ") && handleSelectMethod("api", "oauth")
                    }
                  >
                    <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                      <FaGlobe style={{ color: "#ff4f5e", fontSize: "20px", marginTop: "4px" }} />
                      <div>
                        <FLPText fontWeight="bold" fontSize="sm">
                          OAuth 2.0 Auth Flow
                        </FLPText>
                        <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "2px" }}>
                          Redirect securely to Monzo's login portal to grant read-only access.
                        </FLPText>
                      </div>
                    </div>
                  </div>
                )}

                {/* Option 2: Simulated Demo */}
                <div
                  className={methodCardStyle}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectMethod("demo")}
                  onKeyDown={(e) =>
                    (e.key === "Enter" || e.key === " ") && handleSelectMethod("demo")
                  }
                >
                  <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                    <FaSpinner style={{ color: "#a1a1aa", fontSize: "20px", marginTop: "4px" }} />
                    <div>
                      <FLPText fontWeight="bold" fontSize="sm">
                        Simulated Demo Sync
                      </FLPText>
                      <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "2px" }}>
                        Instantly seed mock accounts and transaction feeds. Perfect for testing
                        layout and charts.
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

          {/* Step 3: Starling PAT Input */}
          {step === "tokenInput" && selectedBank && (
            <>
              <div>
                <FLPHeading as="h2" size="lg">
                  Starling Personal Token
                </FLPHeading>
                <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "4px" }}>
                  Generate a Personal Access Token in the Starling Developer Portal.
                </FLPText>
              </div>

              <div className={scrollContainerStyle}>
                <FLPInput
                  label="Developer Access Token"
                  name="token"
                  placeholder="Bearer token starting with eyJ..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                />
                <div style={{ marginTop: "16px" }}>
                  <FLPText color="text.muted" fontSize="xs">
                    * Make sure your token has permissions `account:read` and `balance:read`
                    configured.
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
                      {connMode === "demo"
                        ? "Simulated Demo Connection"
                        : "Secure Open Banking API Connection"}
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
                <FLPButton
                  variant="outline"
                  onClick={() =>
                    selectedBank.id === "monzo" || selectedBank.id === "starling"
                      ? setStep("method")
                      : setStep("select")
                  }
                >
                  Back
                </FLPButton>
                <FLPButton onClick={handleAuthorize} variant="primary">
                  {connMode === "demo" ? "Confirm & Sync" : "Redirect to Authorize"}
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default ConnectBankWizard;
