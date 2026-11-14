import {
  Button,
  Card,
  CollapsibleDrawer,
  ConfirmDialog,
  controlProps,
  FormField,
  Icon,
  InlineAlert,
  Select,
  StatusBadge,
  Switch,
  TextInput,
  useOptionalToast,
  VisuallyHidden,
} from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import { Check, Copy, Download, KeyRound } from "lucide-react";
import { type FC, useCallback, useState } from "react";
import {
  sectionCard,
  sectionHeading,
  sectionLead,
  statusText,
  tabStack,
} from "~/features/settings/settings.styles";
import {
  actionRow,
  factList,
  formActions,
  formGrid,
  formStack,
  serverRow,
  setupLink,
  setupNote,
  setupSteps,
  tokenCell,
  tokenLabel,
  tokenList,
  tokenPrefix,
  tokenRow,
  tokenValue,
} from "./McpConnectionCard.styles";

const TOKEN_EXPIRY_DAYS = [7, 30, 90, 365] as const;

export const TOKENS_UNAVAILABLE = "Connection tokens are not available for your account yet.";
export const CREATE_FAILED = "The token could not be created. Try again in a moment.";
export const REVOKE_FAILED = "The token could not be disconnected. Try again in a moment.";
export const RATE_LIMITED = "Too many tokens created recently. Try again later.";
export const EXPORT_FAILED = "The summary could not be loaded. Try again in a moment.";
/** The only messages the card shows; anything else falls back to a fixed line. */
const SAFE_MESSAGES = new Set([TOKENS_UNAVAILABLE, CREATE_FAILED, REVOKE_FAILED, RATE_LIMITED]);

/** The opt-in write scope (E17 re-plan section 5): stage only, never commit. */
export const STAGE_SCOPE = "write:stage";
export const STAGING_TOGGLE_LABEL = "Let this connection prepare imports for you to review";
export const STAGING_TOGGLE_HINT =
  "The assistant can prepare balances, such as from a spreadsheet, as an import. Nothing is saved until you review it and confirm in Flump. It cannot confirm imports or delete anything. Off by default.";
const EXPIRY_OPTIONS = TOKEN_EXPIRY_DAYS.map((d) => ({
  value: String(d),
  label: { 7: "7 days", 30: "30 days", 90: "90 days (default)", 365: "1 year" }[d],
}));

/** Facts about every connection, said once (RESCORE Settings 3). */
const REQUESTS_PER_MINUTE = 60;
const countFormat = new Intl.NumberFormat("en-GB");
const pluralRules = new Intl.PluralRules("en-GB");
const requestCount = (n: number) =>
  `${countFormat.format(n)} ${pluralRules.select(n) === "one" ? "request" : "requests"}`;

export interface McpTokenItem {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: string[];
  anonymizeInstitutions: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  totalToolCalls: number;
  createdAt: string;
  isRevoked: boolean;
  isExpired: boolean;
}

export interface CreatedTokenResult {
  id: string;
  name: string;
  rawToken: string;
  tokenPrefix: string;
  scopes: string[];
  anonymizeInstitutions: boolean;
  expiresAt: string | null;
}

export interface McpConnectionCardProps {
  initialTokens?: McpTokenItem[];
  /** `allowStaging` asks for the opt-in `write:stage` scope (off unless the user turns it on). */
  onGenerateToken?: (
    name: string,
    anonymize: boolean,
    expiryDays: number,
    allowStaging: boolean,
  ) => Promise<CreatedTokenResult>;
  onRevokeToken?: (tokenId: string) => Promise<void>;
  onFetchContextPack?: (anonymize: boolean) => Promise<{ pack: any; markdown: string }>;
  /** The marketing page that explains AI connections in full; the steps link to it. */
  guideUrl?: string;
  /** The address an AI assistant connects to, shown with a Copy button in the steps. */
  serverUrl?: string;
  className?: string;
}

/** The in-place setup steps (owner ruling: the preview never ships without guidance). */
export const HOW_TO_CONNECT_TITLE = "How to connect";
export const HOW_TO_CONNECT_STEPS = [
  "Create a token above and copy it. It is shown only once.",
  "In your AI assistant, add Flump as a custom connector (an MCP server) at the address below.",
  "Paste the token when the assistant asks for one.",
  "Ask about the figures you have saved. You can disconnect it here at any time.",
] as const;

/** A positive toast through the app's ToastProvider; a no-op without one (isolated tests). */
const useNotify = () => {
  const toast = useOptionalToast()?.toast;
  return useCallback((title: string) => toast?.({ title, tone: "positive" }), [toast]);
};

const downloadFile = (contents: string, type: string, extension: string) => {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `flump-context-pack-${new Date().toISOString().slice(0, 10)}.${extension}`;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Two Security-tab sections: AI connections (facts, tokens and their setup) and the summary
 * export. Every completed action shows on the card and also raises a toast.
 */
export const McpConnectionCard: FC<McpConnectionCardProps> = ({
  initialTokens = [],
  onGenerateToken,
  onRevokeToken,
  onFetchContextPack,
  guideUrl,
  serverUrl,
  className,
}) => {
  const notify = useNotify();
  const [tokens, setTokens] = useState<McpTokenItem[]>(initialTokens);
  const [anonymizeInstitutions, setAnonymizeInstitutions] = useState<boolean>(true);
  const [showGenerateForm, setShowGenerateForm] = useState<boolean>(false);
  const [tokenName, setTokenName] = useState<string>("Claude Desktop");
  const [expirySelection, setExpirySelection] = useState<string>("90");
  const [allowStaging, setAllowStaging] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<boolean>(false);
  const [exportingContextPack, setExportingContextPack] = useState<boolean>(false);
  const [exportedSuccess, setExportedSuccess] = useState<boolean>(false);
  /** A safe, user-facing message from the last failed create or export. */
  const [actionError, setActionError] = useState<string | null>(null);
  /** The token waiting on the disconnect confirmation. */
  const [revokeTarget, setRevokeTarget] = useState<McpTokenItem | null>(null);
  const [revoking, setRevoking] = useState<boolean>(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const errorText = (e: unknown, fallback: string) =>
    e instanceof Error && SAFE_MESSAGES.has(e.message) ? e.message : fallback;

  const handleCopyToken = async (text: string) => {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(text);
    setCopiedToken(true);
    notify("Token copied");
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleCreateToken = async () => {
    if (!tokenName.trim()) return;
    setGenerating(true);
    setActionError(null);
    try {
      // The API only issues expiring tokens (E17 D5-A, E20-N16): 7, 30, 90 or 365 days.
      const expiryDays = TOKEN_EXPIRY_DAYS.find((d) => String(d) === expirySelection) ?? 90;

      // Tokens are only ever issued by the backend. With no handler wired there is nothing to
      // create (E16 D8-A: the old client-side random token was fake and has been removed).
      if (!onGenerateToken) return;
      const result: CreatedTokenResult = await onGenerateToken(
        tokenName.trim(),
        // The API rejects un-anonymised tokens until step-up exists (E20-N16).
        true,
        expiryDays,
        allowStaging,
      );

      setNewlyCreatedToken(result.rawToken);
      setTokens((prev) => [
        {
          id: result.id,
          name: result.name,
          tokenPrefix: result.tokenPrefix,
          scopes: result.scopes,
          anonymizeInstitutions: result.anonymizeInstitutions,
          expiresAt: result.expiresAt,
          lastUsedAt: null,
          totalToolCalls: 0,
          createdAt: new Date().toISOString(),
          isRevoked: false,
          isExpired: false,
        },
        ...prev,
      ]);
      setShowGenerateForm(false);
      setAllowStaging(false);
    } catch (e) {
      setActionError(errorText(e, CREATE_FAILED));
    } finally {
      setGenerating(false);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!revokeTarget) return;
    const { id } = revokeTarget;
    setRevoking(true);
    setRevokeError(null);
    try {
      if (onRevokeToken) await onRevokeToken(id);
    } catch (e) {
      setRevokeError(errorText(e, REVOKE_FAILED));
      return;
    } finally {
      setRevoking(false);
    }
    setTokens((prev) => prev.map((t) => (t.id === id ? { ...t, isRevoked: true } : t)));
    setRevokeTarget(null);
    notify("Token disconnected");
  };

  const handleExportContextPack = async (format: "clipboard" | "json" | "markdown") => {
    setExportingContextPack(true);
    setActionError(null);
    try {
      const data: { pack: any; markdown: string } = onFetchContextPack
        ? await onFetchContextPack(anonymizeInstitutions)
        : {
            pack: {
              metadata: {
                isAnonymized: anonymizeInstitutions,
                generatedAt: new Date().toISOString(),
              },
            },
            markdown: `# Flump context pack\nAnonymised: ${anonymizeInstitutions ? "yes" : "no"}\n`,
          };

      if (format === "clipboard") {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(data.markdown);
          setExportedSuccess(true);
          notify("Summary copied");
          setTimeout(() => setExportedSuccess(false), 2500);
        }
      } else if (format === "json") {
        downloadFile(JSON.stringify(data.pack, null, 2), "application/json", "json");
      } else {
        downloadFile(data.markdown, "text/markdown", "md");
      }
    } catch {
      setActionError(EXPORT_FAILED);
    } finally {
      setExportingContextPack(false);
    }
  };

  const tokenRows =
    tokens.length > 0 ? (
      <ul
        aria-label="Connection tokens"
        className={tokenList()}
        data-testid="active-tokens-table"
        id="active-tokens-table"
      >
        {tokens.map((tok) => (
          <li
            className={tokenRow()}
            data-testid={`token-row-${tok.id}`}
            id={`token-row-${tok.id}`}
            key={tok.id}
          >
            <div className={tokenCell({ part: "name" })}>
              <span className={tokenLabel()}>{tok.name}</span>
              <StatusBadge size="sm" variant="neutral">
                {tok.isRevoked ? "Disconnected" : tok.isExpired ? "Expired" : "Active"}
              </StatusBadge>
            </div>
            <div className={tokenCell()}>
              <code className={tokenPrefix()}>{tok.tokenPrefix}</code>
            </div>
            <div className={tokenCell()}>
              <StatusBadge size="sm" variant="neutral">
                {tok.anonymizeInstitutions ? "Names hidden" : "Names shown"}
              </StatusBadge>
              {tok.scopes.includes(STAGE_SCOPE) ? (
                <StatusBadge size="sm" variant="neutral">
                  Can prepare imports
                </StatusBadge>
              ) : null}
            </div>
            <div className={tokenCell({ part: "usage" })}>
              <span>
                {tok.lastUsedAt
                  ? `Last used ${new Date(tok.lastUsedAt).toLocaleDateString("en-GB")}`
                  : "Not used yet"}
              </span>
              <span>{requestCount(tok.totalToolCalls)}</span>
            </div>
            {!tok.isRevoked && !tok.isExpired ? (
              <div className={tokenCell({ part: "action" })}>
                <Button
                  aria-label={`Disconnect ${tok.name}`}
                  data-testid={`revoke-token-${tok.id}`}
                  id={`revoke-token-${tok.id}`}
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setRevokeError(null);
                    setRevokeTarget(tok);
                  }}
                >
                  Disconnect
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    ) : null;

  return (
    <div className={cx(tabStack(), className)}>
      <Card
        aria-labelledby="ai-connections-heading"
        as="section"
        className={sectionCard()}
        data-testid="ai-connections-card"
        id="ai-connections-card"
      >
        <h2 className={sectionHeading()} id="ai-connections-heading">
          AI connections (preview)
        </h2>
        <p className={sectionLead()}>
          Create a token to let an AI assistant read the figures you have saved in Flump.
        </p>

        <ul className={factList()} data-testid="ai-connection-facts" id="ai-connection-facts">
          <li>Flump calculates the figures it sends to the assistant.</li>
          <li>Bank and provider names are always replaced with generic labels.</li>
          <li>Flump has no feature to make payments.</li>
          <li>Each connection can make up to {REQUESTS_PER_MINUTE} requests a minute.</li>
        </ul>

        {actionError ? (
          <p
            className={statusText({ tone: "danger" })}
            data-testid="mcp-token-error"
            id="mcp-token-error"
            role="alert"
          >
            {actionError}
          </p>
        ) : null}

        {newlyCreatedToken ? (
          <InlineAlert
            action={
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() => handleCopyToken(newlyCreatedToken)}
              >
                <Icon icon={copiedToken ? Check : Copy} size="sm" />
                {copiedToken ? "Copied" : "Copy"}
              </Button>
            }
            data-testid="new-token-banner"
            id="new-token-banner"
            title="Token created"
            tone="positive"
          >
            Copy it now. It will not be shown again.
            <code className={tokenValue()}>{newlyCreatedToken}</code>
          </InlineAlert>
        ) : null}

        {!onGenerateToken ? (
          <p className={statusText()} data-testid="token-creation-unavailable">
            Connection tokens are not available yet. You can still export a summary below.
          </p>
        ) : !showGenerateForm ? (
          <div className={actionRow()}>
            <Button
              data-testid="generate-token-trigger"
              id="generate-token-trigger"
              size="sm"
              variant="primary"
              onClick={() => setShowGenerateForm(true)}
            >
              <Icon icon={KeyRound} size="sm" />
              Create token
            </Button>
          </div>
        ) : (
          <div className={formStack()} data-testid="token-generate-form" id="token-generate-form">
            <div className={formGrid()}>
              <FormField id="mcp-token-name" label="Connection name">
                {(field) => (
                  <TextInput
                    {...controlProps(field)}
                    placeholder="For example, Claude Desktop"
                    size="sm"
                    type="text"
                    value={tokenName}
                    onChange={(e) => setTokenName(e.target.value)}
                  />
                )}
              </FormField>
              <FormField id="mcp-token-expiry" label="Token expires after">
                {(field) => (
                  <Select
                    {...controlProps(field)}
                    options={EXPIRY_OPTIONS}
                    size="sm"
                    value={expirySelection}
                    onChange={(e) => setExpirySelection(e.target.value)}
                  />
                )}
              </FormField>
            </div>

            <Switch
              checked={allowStaging}
              data-testid="mcp-token-allow-staging"
              hint={STAGING_TOGGLE_HINT}
              id="mcp-token-allow-staging"
              label={STAGING_TOGGLE_LABEL}
              onChange={(e) => setAllowStaging(e.target.checked)}
            />

            <div className={formActions()}>
              <Button size="sm" variant="ghost" onClick={() => setShowGenerateForm(false)}>
                Cancel
              </Button>
              <Button
                data-testid="confirm-generate-token"
                disabled={!tokenName.trim()}
                id="confirm-generate-token"
                pending={generating}
                size="sm"
                variant="primary"
                onClick={handleCreateToken}
              >
                Create token
              </Button>
            </div>
          </div>
        )}

        {tokenRows}

        <CollapsibleDrawer title={HOW_TO_CONNECT_TITLE} variant="quiet">
          <div className={setupNote()} data-testid="set-up-panel" id="set-up-panel">
            <ol className={setupSteps()}>
              {HOW_TO_CONNECT_STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            {serverUrl ? (
              <div className={serverRow()}>
                <code className={tokenPrefix()} data-testid="mcp-server-url">
                  {serverUrl}
                </code>
                <Button
                  aria-label="Copy the server address"
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    if (!navigator.clipboard) return;
                    await navigator.clipboard.writeText(serverUrl);
                    notify("Address copied");
                  }}
                >
                  <Icon icon={Copy} size="sm" />
                  Copy
                </Button>
              </div>
            ) : null}
            {guideUrl ? (
              <a className={setupLink()} href={guideUrl} rel="noopener" target="_blank">
                AI connections on the Flump website
                <VisuallyHidden> (opens in a new tab)</VisuallyHidden>
              </a>
            ) : null}
          </div>
        </CollapsibleDrawer>
      </Card>

      <Card
        aria-labelledby="context-pack-heading"
        as="section"
        className={sectionCard()}
        data-testid="offline-context-pack-card"
        id="offline-context-pack-card"
      >
        <h2 className={sectionHeading()} id="context-pack-heading">
          Export a summary for an AI assistant
        </h2>
        <p className={sectionLead()}>
          Copy a summary of your figures to paste into any AI assistant, without connecting one.
        </p>

        <Switch
          checked={anonymizeInstitutions}
          data-testid="mcp-anonymize-toggle"
          id="mcp-anonymize-toggle"
          label="Hide bank and provider names in the summary"
          onChange={(e) => setAnonymizeInstitutions(e.target.checked)}
        />

        <div className={actionRow()}>
          <Button
            data-testid="copy-context-pack-btn"
            disabled={exportingContextPack}
            id="copy-context-pack-btn"
            size="sm"
            variant="secondary"
            onClick={() => handleExportContextPack("clipboard")}
          >
            <Icon icon={exportedSuccess ? Check : Copy} size="sm" />
            {exportedSuccess ? "Copied" : "Copy summary"}
          </Button>
          <Button
            data-testid="download-md-btn"
            disabled={exportingContextPack}
            id="download-md-btn"
            size="sm"
            variant="outline"
            onClick={() => handleExportContextPack("markdown")}
          >
            <Icon icon={Download} size="sm" />
            Download as Markdown
          </Button>
          <Button
            data-testid="download-json-btn"
            disabled={exportingContextPack}
            id="download-json-btn"
            size="sm"
            variant="outline"
            onClick={() => handleExportContextPack("json")}
          >
            <Icon icon={Download} size="sm" />
            Download as JSON
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        confirmLabel="Disconnect"
        description="The assistant using this token loses access straight away. This cannot be undone."
        error={revokeError}
        id="revoke-token-dialog"
        open={revokeTarget !== null}
        pending={revoking}
        pendingLabel="Disconnecting"
        title={revokeTarget ? `Disconnect ${revokeTarget.name}?` : "Disconnect this token?"}
        tone="danger"
        onConfirm={handleConfirmRevoke}
        onOpenChange={(open) => {
          if (!open && !revoking) setRevokeTarget(null);
        }}
      />
    </div>
  );
};

export default McpConnectionCard;
