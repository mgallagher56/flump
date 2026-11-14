import { Button, controlProps, Dialog, FormField, Icon, StatusBadge, TextInput } from "@repo/ui";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Globe,
  KeyRound,
  Landmark,
  Loader2,
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
    desc: "Preview: connect with an access token or bank sign-in",
    accounts: ["Monzo Current Account", "Monzo Savings Pots"],
    directSync: true,
  },
  {
    id: "starling",
    name: "Starling Bank",
    desc: "Preview: connect with an access token or bank sign-in",
    accounts: ["Starling Current Account", "Starling Savings Spaces"],
    directSync: true,
  },
  {
    id: "trading212",
    name: "Trading 212",
    desc: "Preview: connect with an API key",
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
  // True when the message came from the bank (through the action), so it gets its own label.
  const [errorFromBank, setErrorFromBank] = useState(false);
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
        setErrorMessage("We could not start the bank sign-in. Nothing was connected. Try again.");
        setErrorFromBank(false);
        setStep("error");
        return;
      }
      window.location.href = res.redirectUrl;
      return;
    }

    if (res.error) {
      setErrorMessage(res.error);
      setErrorFromBank(true);
      setStep("error");
      return;
    }

    if (authType === "oauth" && !res.redirectUrl) {
      setErrorMessage(
        res.message ||
          "We could not start the sign-in for this bank. Nothing was connected. Use an access token instead.",
      );
      setErrorFromBank(Boolean(res.message));
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
    setErrorFromBank(false);
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

  const tokenLabel = selectedBank?.id === "trading212" ? "Trading 212 API key" : "Access token";
  // Monzo and Starling tokens start with eyJ; the others need no placeholder (the hint says it).
  const tokenPlaceholder =
    selectedBank?.id === "monzo" || selectedBank?.id === "starling"
      ? "For example, eyJ…"
      : undefined;
  const tokenHelp =
    selectedBank?.id === "monzo"
      ? "Sign in at developers.monzo.com and copy your access token from the playground."
      : selectedBank?.id === "starling"
        ? "In the Starling Developer Console, create an access token with the account:read and balance:read permissions."
        : selectedBank?.id === "trading212"
          ? "In the Trading 212 app, go to Settings, then API. Create an API key and paste it here."
          : `Paste a read-only access token from ${selectedBank?.name}, or go back and choose "Bank sign-in".`;

  // One dialog, one title per step: the step decides the title, description, body and footer.
  let title = "Connect a bank";
  let description: string | undefined = "Choose your bank. Bank connection is a preview.";
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
                  {/* No badge on banks that connect: bank connection is a preview (ruling 4). */}
                  {bank.directSync ? null : (
                    <StatusBadge size="sm" variant="neutral">
                      Not yet
                    </StatusBadge>
                  )}
                </span>
                <span className={cardMeta()}>{bank.desc}</span>
              </span>
              <Icon icon={ChevronRight} size="sm" />
            </button>
          ))}
          {filteredBanks.length === 0 && (
            <p className={helperText()}>
              No bank matches that search. You can add the account by hand.
            </p>
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
    description = `Choose how to connect to ${selectedBank.name}.`;
    body = (
      <div className={stack()}>
        <button className={methodCard()} type="button" onClick={() => handleSelectMethod("pat")}>
          <span className={methodIcon()}>
            <Icon icon={KeyRound} size="md" />
          </span>
          <span className={methodCardBody()}>
            <span className={cardTitle()}>Access token</span>
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
            <span className={cardTitle()}>Bank sign-in</span>
            <span className={cardMeta()}>Sign in at {selectedBank.name} to connect.</span>
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
    title = `${selectedBank.name} access token`;
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
          Connect bank
        </Button>
      </>
    );
  } else if (step === "consent" && selectedBank) {
    title = `Connect to ${selectedBank.name}`;
    description = "Check what Flump will be able to read.";
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
        <p className={helperText()}>If you continue, Flump can read:</p>
        <div className={bulletList()}>
          <div className={bulletItem()}>
            <Icon icon={ShieldCheck} size="sm" />
            <span className={bankCardBody()}>
              <span className={cardTitle()}>Your accounts</span>
              <span className={cardMeta()}>Account names, currencies, and pots or spaces.</span>
            </span>
          </div>
          <div className={bulletItem()}>
            <Icon icon={Landmark} size="sm" />
            <span className={bankCardBody()}>
              <span className={cardTitle()}>Balances and transactions</span>
              <span className={cardMeta()}>Current balances and your past transactions.</span>
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
        <Button onClick={handleAuthorize}>Go to bank sign-in</Button>
      </>
    );
  } else if (step === "syncing" && selectedBank) {
    title = `Connecting to ${selectedBank.name}`;
    description = "Reading your accounts and balances…";
    body = (
      <div className={centred()} role="status">
        <span className={spinner()}>
          <Icon icon={Loader2} size="lg" />
        </span>
      </div>
    );
  } else if (step === "success" && selectedBank) {
    title = "Connected";
    description = `Your ${selectedBank.name} accounts are connected.`;
    body = (
      <div className={stack()}>
        <div className={centred()}>
          <span className={statusIconSuccess()}>
            <Icon icon={CheckCircle2} size="lg" />
          </span>
        </div>
        <p className={stateHeading()}>Accounts added</p>
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
    title = "We could not connect";
    description = `We could not connect to ${selectedBank.name}. Nothing was added.`;
    body = (
      <div className={stack()}>
        <div className={centred()}>
          <span className={statusIconDanger()}>
            <Icon icon={TriangleAlert} size="lg" />
          </span>
        </div>
        <div className={errorBox()} role="alert">
          {errorMessage && errorFromBank ? (
            <p className={errorLabel()}>What the bank told us</p>
          ) : null}
          <p className={errorMessageText()}>
            {errorMessage ||
              "Check the access token is correct and has not expired, then try again."}
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
    description = "This bank cannot be connected yet.";
    body = (
      <div className={noticeBox()}>
        <div className={noticeRow()}>
          <Icon icon={ShieldCheck} size="md" />
          <p className={tokenHint()}>
            Bank connection is a preview. You can try it with <strong>Monzo</strong> and{" "}
            <strong>Starling Bank</strong>, using your own read-only access token.
          </p>
        </div>
        <p className={helperText()}>
          To add your {selectedBank.name} accounts now, choose <strong>Add by hand</strong> when you
          add an account.
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
        Connect a bank
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
