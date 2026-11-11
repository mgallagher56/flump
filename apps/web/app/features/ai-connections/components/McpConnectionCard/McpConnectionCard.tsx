import { Button, SegmentedTabs, StatusBadge } from "@repo/ui";
import { css, cx } from "@repo/ui/styled-system/css";
import { flex, stack } from "@repo/ui/styled-system/patterns";
import { type FC, useState } from "react";
import {
  FaCheck,
  FaCheckCircle,
  FaCopy,
  FaDownload,
  FaKey,
  FaLock,
  FaRobot,
  FaShieldAlt,
  FaTrash,
} from "react-icons/fa";
import {
  codeSnippetBox,
  connectionCard,
  connectionContainer,
  copyButton,
  headerRow,
  toggleKnob,
  toggleSwitch,
  tokenTable,
  tokenTableCell,
  tokenTableHeader,
} from "./McpConnectionCard.styles";

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
  onGenerateToken?: (
    name: string,
    anonymize: boolean,
    expiryDays: number | null,
  ) => Promise<CreatedTokenResult>;
  onRevokeToken?: (tokenId: string) => Promise<void>;
  onFetchContextPack?: (anonymize: boolean) => Promise<{ pack: any; markdown: string }>;
  className?: string;
}

export const McpConnectionCard: FC<McpConnectionCardProps> = ({
  initialTokens = [],
  onGenerateToken,
  onRevokeToken,
  onFetchContextPack,
  className,
}) => {
  const [tokens, setTokens] = useState<McpTokenItem[]>(initialTokens);
  const [activeTab, setActiveTab] = useState<string>("local_cli");
  const [anonymizeInstitutions, setAnonymizeInstitutions] = useState<boolean>(true);
  const [showGenerateForm, setShowGenerateForm] = useState<boolean>(false);
  const [tokenName, setTokenName] = useState<string>("Claude Desktop");
  const [expirySelection, setExpirySelection] = useState<string>("90");
  const [generating, setGenerating] = useState<boolean>(false);
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);

  const [copiedToken, setCopiedToken] = useState<boolean>(false);
  const [exportingContextPack, setExportingContextPack] = useState<boolean>(false);
  const [exportedSuccess, setExportedSuccess] = useState<boolean>(false);

  const activeTokenPlaceholder =
    newlyCreatedToken ||
    tokens.find((t) => !t.isRevoked && !t.isExpired)?.tokenPrefix ||
    "flump_pat_YOUR_TOKEN_HERE";

  const handleCopy = (text: string, setCopied: (v: boolean) => void) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreateToken = async () => {
    if (!tokenName.trim()) return;
    setGenerating(true);
    try {
      const expiryDays = expirySelection === "30" ? 30 : expirySelection === "90" ? 90 : null;

      let result: CreatedTokenResult;
      if (onGenerateToken) {
        result = await onGenerateToken(tokenName.trim(), anonymizeInstitutions, expiryDays);
      } else {
        // Fallback generator for mockup/testing
        const mockRaw = `flump_pat_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
        result = {
          id: `tok_${Date.now()}`,
          name: tokenName.trim(),
          rawToken: mockRaw,
          tokenPrefix: `flump_pat_${mockRaw.slice(10, 14)}...${mockRaw.slice(-4)}`,
          scopes: ["mcp:read:anonymized", "mcp:simulate"],
          anonymizeInstitutions,
          expiresAt: expiryDays ? new Date(Date.now() + expiryDays * 86400000).toISOString() : null,
        };
      }

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
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (onRevokeToken) {
      await onRevokeToken(id);
    }
    setTokens((prev) => prev.map((t) => (t.id === id ? { ...t, isRevoked: true } : t)));
  };

  const handleExportContextPack = async (format: "clipboard" | "json" | "markdown") => {
    setExportingContextPack(true);
    try {
      let data: { pack: any; markdown: string };
      if (onFetchContextPack) {
        data = await onFetchContextPack(anonymizeInstitutions);
      } else {
        data = {
          pack: {
            metadata: {
              isAnonymized: anonymizeInstitutions,
              generatedAt: new Date().toISOString(),
            },
          },
          markdown: `# FLUMP UK FINANCIAL CONTEXT PACK\nAnonymized: ${anonymizeInstitutions ? "YES" : "NO"}\n`,
        };
      }

      if (format === "clipboard") {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(data.markdown);
          setExportedSuccess(true);
          setTimeout(() => setExportedSuccess(false), 2500);
        }
      } else if (format === "json") {
        const blob = new Blob([JSON.stringify(data.pack, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `flump-context-pack-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === "markdown") {
        const blob = new Blob([data.markdown], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `flump-context-pack-${new Date().toISOString().slice(0, 10)}.md`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setExportingContextPack(false);
    }
  };

  return (
    <div className={cx(connectionContainer(), className)}>
      {/* Card 1: Connect Live via MCP */}
      <div className={connectionCard()}>
        <div className={headerRow()}>
          <div className={flex({ align: "center", gap: "2.5" })}>
            <div
              className={css({
                width: "36px",
                height: "36px",
                borderRadius: "lg",
                backgroundColor: "primary.subtle",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "primary",
              })}
            >
              <FaRobot size={18} />
            </div>
            <div>
              <h3
                className={css({
                  fontFamily: "display",
                  fontSize: "md",
                  fontWeight: "bold",
                  color: "text.primary",
                  margin: 0,
                })}
              >
                Model Context Protocol (MCP) & AI Connections (preview)
              </h3>
              <p
                className={css({
                  fontSize: "xs",
                  color: "text.muted",
                  margin: "2px 0 0 0",
                })}
              >
                Preview: MCP tools currently run against sample/baseline data.
              </p>
            </div>
          </div>

          <StatusBadge size="sm" variant="brand">
            Official MCP SDK v1.0
          </StatusBadge>
        </div>

        {/* Features & Benefits Strip */}
        <div
          className={css({
            display: "grid",
            gridTemplateColumns: { base: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr 1fr" },
            gap: "10px",
          })}
        >
          <div
            className={css({
              padding: "10px 12px",
              borderRadius: "md",
              backgroundColor: "surface.sunken",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "border.subtle",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            })}
          >
            <span
              className={css({ fontSize: "xs", fontWeight: "semibold", color: "text.primary" })}
            >
              Deterministic Math
            </span>
            <span className={css({ fontSize: "11px", color: "text.muted" })}>
              Zero hallucinations via @flump/finance-engine
            </span>
          </div>

          <div
            className={css({
              padding: "10px 12px",
              borderRadius: "md",
              backgroundColor: "surface.sunken",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "border.subtle",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            })}
          >
            <span
              className={css({ fontSize: "xs", fontWeight: "semibold", color: "text.primary" })}
            >
              PII Scrubbed
            </span>
            <span className={css({ fontSize: "11px", color: "text.muted" })}>
              Names, emails & account numbers removed
            </span>
          </div>

          <div
            className={css({
              padding: "10px 12px",
              borderRadius: "md",
              backgroundColor: "surface.sunken",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "border.subtle",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            })}
          >
            <span
              className={css({ fontSize: "xs", fontWeight: "semibold", color: "text.primary" })}
            >
              No payment features
            </span>
            <span className={css({ fontSize: "11px", color: "text.muted" })}>
              Flump has no feature to make payments
            </span>
          </div>

          <div
            className={css({
              padding: "10px 12px",
              borderRadius: "md",
              backgroundColor: "surface.sunken",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "border.subtle",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            })}
          >
            <span
              className={css({ fontSize: "xs", fontWeight: "semibold", color: "text.primary" })}
            >
              Rate Limited
            </span>
            <span className={css({ fontSize: "11px", color: "text.muted" })}>
              60 req/min bucket prevents runaway loops
            </span>
          </div>
        </div>

        {/* Anonymization Toggle Switch */}
        <div
          className={css({
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderRadius: "lg",
            backgroundColor: "surface.sunken",
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: "border.subtle",
          })}
        >
          <div className={flex({ align: "center", gap: "2.5" })}>
            <FaShieldAlt className={css({ color: "primary" })} size={16} />
            <div>
              <span
                className={css({
                  fontSize: "xs",
                  fontWeight: "semibold",
                  color: "text.primary",
                  display: "block",
                })}
              >
                Anonymize Bank & Institution Names over MCP
              </span>
              <span
                className={css({
                  fontSize: "11px",
                  color: "text.muted",
                  display: "block",
                })}
              >
                Replaces bank names (e.g. &quot;Monzo&quot;) with generic indexed labels (e.g.
                &quot;Current Account #1&quot;).
              </span>
            </div>
          </div>

          <button
            aria-label="Toggle bank name anonymization"
            className={toggleSwitch({ checked: anonymizeInstitutions })}
            id="mcp-anonymize-toggle"
            data-testid="mcp-anonymize-toggle"
            type="button"
            onClick={() => setAnonymizeInstitutions((v) => !v)}
          >
            <div className={toggleKnob({ checked: anonymizeInstitutions })} />
          </button>
        </div>

        {/* Newly Created Token Alert */}
        {newlyCreatedToken && (
          <div
            className={css({
              padding: "14px 16px",
              borderRadius: "lg",
              backgroundColor: "status.positive.bg",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "status.positive.border",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            })}
            id="new-token-banner"
            data-testid="new-token-banner"
          >
            <div className={flex({ align: "center", gap: "1.5" })}>
              <FaCheckCircle className={css({ color: "status.positive.text" })} />
              <span
                className={css({
                  fontSize: "xs",
                  fontWeight: "bold",
                  color: "status.positive.text",
                })}
              >
                AI Connection Token Generated! Copy it now (it won&apos;t be shown again):
              </span>
            </div>
            <div
              className={css({
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "surface.card",
                padding: "8px 12px",
                borderRadius: "md",
                fontFamily: "mono",
                fontSize: "xs",
                color: "text.primary",
                fontVariantNumeric: "tabular-nums",
                wordBreak: "break-all",
              })}
            >
              <span>{newlyCreatedToken}</span>
              <button
                aria-label="Copy secret token"
                className={css({
                  marginLeft: "auto",
                  padding: "4px 8px",
                  borderRadius: "sm",
                  backgroundColor: "surface.sunken",
                  border: "1px solid",
                  borderColor: "border.subtle",
                  cursor: "pointer",
                  fontSize: "xs",
                  color: "text.primary",
                })}
                type="button"
                onClick={() => handleCopy(newlyCreatedToken, setCopiedToken)}
              >
                {copiedToken ? <FaCheck /> : <FaCopy />}
              </button>
            </div>
          </div>
        )}

        {/* Generate Token Form or Trigger */}
        {!showGenerateForm ? (
          <div className={flex({ justify: "flex-start" })}>
            <Button
              id="generate-token-trigger"
              data-testid="generate-token-trigger"
              size="sm"
              variant="outline"
              onClick={() => setShowGenerateForm(true)}
            >
              <FaKey className={css({ mr: "1.5" })} />+ Generate New AI Connection Token
            </Button>
          </div>
        ) : (
          <div
            className={css({
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              padding: "16px",
              borderRadius: "lg",
              backgroundColor: "surface.sunken",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "border.subtle",
            })}
            id="token-generate-form"
            data-testid="token-generate-form"
          >
            <div
              className={css({
                display: "grid",
                gridTemplateColumns: { base: "1fr", sm: "2fr 1fr" },
                gap: "12px",
              })}
            >
              <div>
                <label
                  className={css({
                    fontSize: "xs",
                    fontWeight: "semibold",
                    color: "text.muted",
                    display: "block",
                    marginBottom: "4px",
                  })}
                  htmlFor="mcp-token-name"
                >
                  Connection / Client Name
                </label>
                <input
                  className={css({
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "md",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    borderColor: "border.strong",
                    backgroundColor: "surface.card",
                    color: "text.primary",
                    fontSize: "xs",
                    outline: "none",
                  })}
                  id="mcp-token-name"
                  placeholder="e.g. Claude Desktop, Cursor AI"
                  type="text"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                />
              </div>

              <div>
                <label
                  className={css({
                    fontSize: "xs",
                    fontWeight: "semibold",
                    color: "text.muted",
                    display: "block",
                    marginBottom: "4px",
                  })}
                  htmlFor="mcp-token-expiry"
                >
                  Token Expiry
                </label>
                <select
                  className={css({
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "md",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    borderColor: "border.strong",
                    backgroundColor: "surface.card",
                    color: "text.primary",
                    fontSize: "xs",
                    outline: "none",
                    cursor: "pointer",
                  })}
                  id="mcp-token-expiry"
                  value={expirySelection}
                  onChange={(e) => setExpirySelection(e.target.value)}
                >
                  <option value="30">30 Days</option>
                  <option value="90">90 Days (Recommended)</option>
                  <option value="never">Never (Persistent)</option>
                </select>
              </div>
            </div>

            <div className={flex({ justify: "flex-end", gap: "2" })}>
              <Button size="sm" variant="ghost" onClick={() => setShowGenerateForm(false)}>
                Cancel
              </Button>
              <Button
                id="confirm-generate-token"
                data-testid="confirm-generate-token"
                disabled={generating || !tokenName.trim()}
                size="sm"
                variant="primary"
                onClick={handleCreateToken}
              >
                {generating ? "Generating..." : "Create Token"}
              </Button>
            </div>
          </div>
        )}

        {/* 3-Tab Setup Snippet Box */}
        <div className={stack({ gap: "2.5" })}>
          <SegmentedTabs
            aria-label="MCP Client Setup Options"
            items={[
              { value: "local_cli", label: "Local CLI (preview)" },
              {
                value: "active_tokens",
                label: `Active Tokens (${tokens.filter((t) => !t.isRevoked && !t.isExpired).length})`,
              },
            ]}
            value={activeTab}
            onValueChange={setActiveTab}
          />

          {/* Tab A: Local CLI (preview) */}
          {activeTab === "local_cli" && (
            <div
              className={css({
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                padding: "12px 14px",
                borderRadius: "md",
                backgroundColor: "surface.sunken",
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: "border.subtle",
                fontSize: "xs",
              })}
              data-testid="local-cli-preview"
              id="local-cli-preview"
            >
              <span className={css({ fontWeight: "semibold", color: "text.primary" })}>
                Setting up Flump MCP (preview)
              </span>
              <span className={css({ color: "text.secondary" })}>
                Local CLI (preview): run Flump MCP from source. Setup guide coming soon.
              </span>
            </div>
          )}

          {/* Tab C: Active Tokens & Audit Log */}
          {activeTab === "active_tokens" && (
            <div
              className={css({
                overflowX: "auto",
                borderRadius: "lg",
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: "border.subtle",
              })}
              id="active-tokens-table"
              data-testid="active-tokens-table"
            >
              <table className={tokenTable()}>
                <thead>
                  <tr>
                    <th className={tokenTableHeader()}>Client Name</th>
                    <th className={tokenTableHeader()}>Token Prefix</th>
                    <th className={tokenTableHeader()}>Privacy Scope</th>
                    <th className={tokenTableHeader()}>Last Used</th>
                    <th className={tokenTableHeader()}>Tool Calls</th>
                    <th className={tokenTableHeader()}>Status</th>
                    <th className={cx(tokenTableHeader(), css({ textAlign: "right" }))}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.length === 0 ? (
                    <tr>
                      <td
                        className={cx(tokenTableCell(), css({ textAlign: "center", p: "5" }))}
                        colSpan={7}
                      >
                        <span className={css({ color: "text.muted" })}>
                          No AI connection tokens generated yet.
                        </span>
                      </td>
                    </tr>
                  ) : (
                    tokens.map((tok) => (
                      <tr key={tok.id}>
                        <td className={tokenTableCell()}>{tok.name}</td>
                        <td className={tokenTableCell()}>
                          <code className={css({ fontSize: "11px" })}>{tok.tokenPrefix}</code>
                        </td>
                        <td className={tokenTableCell()}>
                          <StatusBadge
                            size="sm"
                            variant={tok.anonymizeInstitutions ? "info" : "warning"}
                          >
                            {tok.anonymizeInstitutions ? "Anonymized" : "Full Names"}
                          </StatusBadge>
                        </td>
                        <td className={tokenTableCell()}>
                          {tok.lastUsedAt
                            ? new Date(tok.lastUsedAt).toLocaleDateString("en-GB")
                            : "Never"}
                        </td>
                        <td className={tokenTableCell()}>{tok.totalToolCalls} calls</td>
                        <td className={tokenTableCell()}>
                          {tok.isRevoked ? (
                            <StatusBadge size="sm" variant="danger">
                              Revoked
                            </StatusBadge>
                          ) : tok.isExpired ? (
                            <StatusBadge size="sm" variant="warning">
                              Expired
                            </StatusBadge>
                          ) : (
                            <StatusBadge size="sm" variant="positive">
                              Active
                            </StatusBadge>
                          )}
                        </td>
                        <td className={cx(tokenTableCell(), css({ textAlign: "right" }))}>
                          {!tok.isRevoked && (
                            <button
                              aria-label={`Revoke token ${tok.name}`}
                              className={css({
                                border: "none",
                                background: "none",
                                color: "status.danger.solid",
                                cursor: "pointer",
                                padding: "4px 8px",
                                borderRadius: "sm",
                                fontSize: "xs",
                                _hover: { backgroundColor: "status.danger.bg" },
                              })}
                              id={`revoke-token-${tok.id}`}
                              data-testid={`revoke-token-${tok.id}`}
                              type="button"
                              onClick={() => handleRevoke(tok.id)}
                            >
                              <FaTrash className={css({ mr: "1" })} />
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Card 2: Offline AI Context Pack Exporter */}
      <div
        className={connectionCard()}
        id="offline-context-pack-card"
        data-testid="offline-context-pack-card"
      >
        <div className={headerRow()}>
          <div className={flex({ align: "center", gap: "2.5" })}>
            <div
              className={css({
                width: "36px",
                height: "36px",
                borderRadius: "lg",
                backgroundColor: "status.info.bg",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "status.info.text",
              })}
            >
              <FaLock size={18} />
            </div>
            <div>
              <h3
                className={css({
                  fontFamily: "display",
                  fontSize: "md",
                  fontWeight: "bold",
                  color: "text.primary",
                  margin: 0,
                })}
              >
                Offline AI Context Pack Exporter
              </h3>
              <p
                className={css({
                  fontSize: "xs",
                  color: "text.muted",
                  margin: "2px 0 0 0",
                })}
              >
                Prefer not to connect a live agent? Export your snapshot to paste into an AI
                assistant of your choice.
              </p>
            </div>
          </div>
        </div>

        <div className={flex({ gap: "3", flexWrap: "wrap", align: "center" })}>
          <Button
            id="copy-context-pack-btn"
            data-testid="copy-context-pack-btn"
            disabled={exportingContextPack}
            size="sm"
            variant="primary"
            onClick={() => handleExportContextPack("clipboard")}
          >
            {exportedSuccess ? (
              <FaCheck className={css({ mr: "1.5" })} />
            ) : (
              <FaCopy className={css({ mr: "1.5" })} />
            )}
            {exportedSuccess ? "Copied to Clipboard!" : "Copy Context Pack to Clipboard"}
          </Button>

          <Button
            id="download-md-btn"
            data-testid="download-md-btn"
            disabled={exportingContextPack}
            size="sm"
            variant="outline"
            onClick={() => handleExportContextPack("markdown")}
          >
            <FaDownload className={css({ mr: "1.5" })} />
            Download .md
          </Button>

          <Button
            id="download-json-btn"
            data-testid="download-json-btn"
            disabled={exportingContextPack}
            size="sm"
            variant="outline"
            onClick={() => handleExportContextPack("json")}
          >
            <FaDownload className={css({ mr: "1.5" })} />
            Download .json
          </Button>
        </div>
      </div>
    </div>
  );
};

export default McpConnectionCard;
