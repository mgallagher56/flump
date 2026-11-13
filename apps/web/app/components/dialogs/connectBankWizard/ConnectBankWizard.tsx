import { Button, controlProps, Dialog, FormField, Icon, StatusBadge, TextInput } from "@repo/ui";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Globe,
  KeyRound,
  Landmark,
  Loader2,
  Lock,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { type FC, useEffect, useMemo, useState } from "react";
import { useFetcher } from "react-router";
import { isSafeRedirectUrl } from "~/utils/safeRedirectUrl";
import {
  bankAvatar,
  bankCard,
  bankCardBody,
  bankCardTitleRow,
  bankList,
  bulletItem,
  bulletList,
  cardMeta,
  cardTitle,
  centred,
  consentHeader,
  errorBox,
  errorLabel,
  errorMessageText,
  footerRow,
  helperText,
  importedItem,
  importedList,
  methodCard,
  methodCardBody,
  methodIcon,
  noticeBox,
  noticeRow,
  spinner,
  stack,
  stateHeading,
  stateIcon,
  statusIconDanger,
  statusIconSuccess,
  tokenHint,
} from "./ConnectBankWizard.styles";

interface ConnectBankWizardProps {
  onSuccess?: () => void;
}

interface BankItem {
  id: string;
  name: string;
  desc: string;
  accounts: string[];
  directSync?: boolean;
}

const BANKS: BankItem[] = [
  {
    id: "monzo",
    name: "Monzo Bank",
    desc: "Preview: connect via Developer Token or OAuth",
    accounts: ["Monzo Current Account", "Monzo Savings Pots"],
    directSync: true,
  },
  {
    id: "starling",
    name: "Starling Bank",
    desc: "Preview: connect via Personal Access Token or OAuth",
    accounts: ["Starling Current Account", "Starling Savings Spaces"],
    directSync: true,
  },
  {
    id: "trading212",
    name: "Trading 212",
    desc: "Preview: connect via API Key",
    accounts: ["Trading 212 Portfolio"],
    directSync: true,
  },
  {
    id: "hsbc",
    name: "HSBC Bank",
    desc: "Preview: paste your own read-only access token",
    accounts: ["HSBC Current Account"],
    directSync: true,
  },
  {
    id: "barclays",
    name: "Barclays Bank",
    desc: "Preview: paste your own read-only access token",
    accounts: ["Barclays Everyday Account"],
    directSync: true,
  },
  {
    id: "revolut",
    name: "Revolut",
    desc: "Preview: paste your own read-only access token",
    accounts: ["Revolut Multi-Currency"],
    directSync: true,
  },
  {
    id: "santander",
    name: "Santander",
    desc: "Preview: paste your own read-only access token",
    accounts: ["Santander 123 Current"],
    directSync: true,
  },
  {
    id: "natwest",
    name: "NatWest",
    desc: "Preview: paste your own read-only access token",
    accounts: ["NatWest Select Current"],
    directSync: true,
  },
  {
    id: "lloyds",
    name: "Lloyds Bank",
    desc: "Preview: paste your own read-only access token",
    accounts: ["Lloyds Classic Account"],
    directSync: true,
  },
  {
    id: "chase",
    name: "Chase",
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
          "We couldn't start the bank sign-in for this bank. Please use a developer token.",
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

  const close = () => setOpen(false);

  const tokenLabel =
    selectedBank?.id === "trading212" ? "Trading 212 API key" : "Developer access token";
  const tokenPlaceholder =
    selectedBank?.id === "monzo"
      ? "Monzo access token (for example eyJ…)"
      : selectedBank?.id === "starling"
        ? "Starling bearer token starting with eyJ…"
        : selectedBank?.id === "trading212"
          ? "Trading 212 API key…"
          : "Read-only access token…";
  const tokenHelp =
    selectedBank?.id === "monzo"
      ? "Sign in with your Monzo email at https://developers.monzo.com and copy your access token from the playground."
      : selectedBank?.id === "starling"
        ? "Make sure your token has permissions account:read and balance:read configured in the Starling Developer Portal."
        : selectedBank?.id === "trading212"
          ? "In the Trading 212 app, go to Settings, then API, then generate an API key and copy it here."
          : `Paste a read-only access token from ${selectedBank?.name}, or go back and choose the OAuth flow.`;

  // One dialog, one title per step: the step decides the title, description, body and footer.
  let title = "Connect bank account";
  let description: string | undefined =
    "Choose your bank or financial institution. Bank connection is a preview.";
  let body: React.ReactNode = null;
  let footer: React.ReactNode = null;

  if (step === "select") {
    body = (
      <div className={stack()}>
        <FormField label="Search banks">
          {(field) => (
            <TextInput
              {...controlProps(field)}
              name="search"
              placeholder="Search your bank…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          )}
        </FormField>
        <div className={bankList()}>
          {filteredBanks.map((bank) => (
            <button
              key={bank.id}
              className={bankCard()}
              type="button"
              onClick={() => handleSelectBank(bank)}
            >
              <span aria-hidden="true" className={bankAvatar()}>
                {bank.name.charAt(0)}
              </span>
              <span className={bankCardBody()}>
                <span className={bankCardTitleRow()}>
                  <span className={cardTitle()}>{bank.name}</span>
                  {bank.directSync ? (
                    <StatusBadge size="sm" variant="positive">
                      Live
                    </StatusBadge>
                  ) : (
                    <StatusBadge size="sm" variant="neutral">
                      Soon
                    </StatusBadge>
                  )}
                </span>
                <span className={cardMeta()}>{bank.desc}</span>
              </span>
              <Icon icon={ChevronRight} size="sm" />
            </button>
          ))}
          {filteredBanks.length === 0 && (
            <p className={helperText()}>No banks match your search.</p>
          )}
        </div>
      </div>
    );
    footer = (
      <Button variant="outline" onClick={close}>
        Cancel
      </Button>
    );
  } else if (step === "method" && selectedBank) {
    title = "Choose how to connect";
    description = `Select how you want to connect to ${selectedBank.name}.`;
    body = (
      <div className={stack()}>
        <button className={methodCard()} type="button" onClick={() => handleSelectMethod("pat")}>
          <span className={methodIcon()}>
            <Icon icon={KeyRound} size="md" />
          </span>
          <span className={methodCardBody()}>
            <span className={cardTitle()}>Personal access token (recommended)</span>
            <span className={cardMeta()}>
              Preview: paste your own read-only access token from your provider.
            </span>
          </span>
        </button>
        <button className={methodCard()} type="button" onClick={() => handleSelectMethod("oauth")}>
          <span className={methodIcon()}>
            <Icon icon={Globe} size="md" />
          </span>
          <span className={methodCardBody()}>
            <span className={cardTitle()}>OAuth 2.0 sign-in</span>
            <span className={cardMeta()}>
              Redirect to {selectedBank.name}&apos;s secure portal to authorise read-only access
              (requires server OAuth keys).
            </span>
          </span>
        </button>
      </div>
    );
    footer = (
      <Button variant="outline" onClick={() => setStep("select")}>
        <Icon icon={ArrowLeft} size="sm" />
        Back
      </Button>
    );
  } else if (step === "tokenInput" && selectedBank) {
    title = `${selectedBank.name} developer token`;
    description = "Preview: paste your own read-only access token from your provider.";
    body = (
      <div className={stack()}>
        <FormField hint={tokenHelp} label={tokenLabel}>
          {(field) => (
            <TextInput
              {...controlProps(field)}
              name="token"
              placeholder={tokenPlaceholder}
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
            />
          )}
        </FormField>
      </div>
    );
    footer = (
      <>
        <Button variant="outline" onClick={() => setStep("method")}>
          Back
        </Button>
        <Button disabled={!tokenInput.trim()} onClick={handleConnectWithToken}>
          Connect & Sync
        </Button>
      </>
    );
  } else if (step === "consent" && selectedBank) {
    title = `Link with ${selectedBank.name}`;
    description = "Review the secure sync authorisations requested.";
    body = (
      <div className={stack()}>
        <div className={consentHeader()}>
          <span aria-hidden="true" className={bankAvatar()}>
            {selectedBank.name.charAt(0)}
          </span>
          <span className={bankCardBody()}>
            <span className={cardTitle()}>{selectedBank.name}</span>
            <span className={cardMeta()}>Bank connection (preview)</span>
          </span>
        </div>
        <p className={helperText()}>By continuing, you authorise Flump to retrieve:</p>
        <div className={bulletList()}>
          <div className={bulletItem()}>
            <Icon icon={ShieldCheck} size="sm" />
            <span className={bankCardBody()}>
              <span className={cardTitle()}>Account overview</span>
              <span className={cardMeta()}>
                Retrieve account names, currencies, and sub-spaces.
              </span>
            </span>
          </div>
          <div className={bulletItem()}>
            <Icon icon={Landmark} size="sm" />
            <span className={bankCardBody()}>
              <span className={cardTitle()}>Balances and transactions</span>
              <span className={cardMeta()}>
                Fetch current amounts and your transaction history.
              </span>
            </span>
          </div>
          <div className={bulletItem()}>
            <Icon icon={Lock} size="sm" />
            <span className={bankCardBody()}>
              <span className={cardTitle()}>Read-only access</span>
              <span className={cardMeta()}>
                Flump cannot transfer funds or modify bank settings.
              </span>
            </span>
          </div>
        </div>
      </div>
    );
    footer = (
      <>
        <Button variant="outline" onClick={() => setStep("method")}>
          Back
        </Button>
        <Button onClick={handleAuthorize}>Redirect to authorise</Button>
      </>
    );
  } else if (step === "syncing" && selectedBank) {
    title = `Connecting to ${selectedBank.name}`;
    description = "Establishing secure API link and parsing balances.";
    body = (
      <div className={centred()} role="status">
        <span className={spinner()}>
          <Icon icon={Loader2} size="lg" />
        </span>
      </div>
    );
  } else if (step === "success" && selectedBank) {
    title = "Connected";
    description = `Your accounts from ${selectedBank.name} are now synced.`;
    body = (
      <div className={stack()}>
        <div className={centred()}>
          <span className={statusIconSuccess()}>
            <Icon icon={CheckCircle2} size="lg" />
          </span>
        </div>
        <p className={stateHeading()}>Imported accounts</p>
        <div className={importedList()}>
          {selectedBank.accounts.slice(0, importedCount).map((accName) => (
            <div key={accName} className={importedItem()}>
              <span className={stateIcon()}>
                <Icon icon={Landmark} size="sm" />
              </span>
              <span className={cardTitle()}>{accName}</span>
            </div>
          ))}
        </div>
      </div>
    );
    footer = <Button onClick={close}>Done</Button>;
  } else if (step === "error" && selectedBank) {
    title = "Connection failed";
    description = `We couldn't connect to ${selectedBank.name}.`;
    body = (
      <div className={stack()}>
        <div className={centred()}>
          <span className={statusIconDanger()}>
            <Icon icon={TriangleAlert} size="lg" />
          </span>
        </div>
        <div className={errorBox()} role="alert">
          <p className={errorLabel()}>Error message</p>
          <p className={errorMessageText()}>
            {errorMessage || "Check your credentials or server environment configuration (.env)."}
          </p>
        </div>
      </div>
    );
    footer = (
      <Button variant="outline" onClick={() => setStep("method")}>
        Try again
      </Button>
    );
  } else if (step === "unsupported" && selectedBank) {
    title = `${selectedBank.name}: bank connection`;
    description = "Bank connection coming soon.";
    body = (
      <div className={noticeBox()}>
        <div className={noticeRow()}>
          <Icon icon={ShieldCheck} size="md" />
          <p className={tokenHint()}>
            Bank connection is in preview and does not create mock accounts. You can try it with{" "}
            <strong>Monzo</strong> and <strong>Starling Bank</strong> using your own read-only
            access token.
          </p>
        </div>
        <p className={helperText()}>
          To track your {selectedBank.name} accounts now, use the <strong>Manual entry</strong>{" "}
          option in the Add account dialog.
        </p>
      </div>
    );
    footer = (
      <>
        <Button variant="outline" onClick={() => setStep("select")}>
          <Icon icon={ArrowLeft} size="sm" />
          Back to banks
        </Button>
        <Button onClick={close}>Close</Button>
      </>
    );
  }

  return (
    <>
      <Button onClick={handleOpenModal}>
        <Icon icon={Landmark} size="sm" />
        Connect bank account
      </Button>
      <Dialog
        description={description}
        footer={footer ? <div className={footerRow()}>{footer}</div> : undefined}
        id="connect-bank-wizard"
        open={open}
        title={title}
        onOpenChange={(isOpen) => {
          if (!isOpen) close();
        }}
      >
        {body}
      </Dialog>
    </>
  );
};

export default ConnectBankWizard;
