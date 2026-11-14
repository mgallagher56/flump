import {
  ContextPackResponse,
  CreateMcpTokenResponse,
  McpTokenListResponse,
  RevokeMcpTokenResponse,
} from "@flump/api-contract";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, apiFetchAll } from "~/services/api-client";
import { BackendError } from "~/services/backend-error";
import type {
  CreatedTokenResult,
  McpTokenItem,
} from "./components/McpConnectionCard/McpConnectionCard";

import {
  CREATE_FAILED,
  RATE_LIMITED,
  REVOKE_FAILED,
  TOKENS_UNAVAILABLE,
} from "./components/McpConnectionCard/McpConnectionCard";

export { CREATE_FAILED, RATE_LIMITED, REVOKE_FAILED, TOKENS_UNAVAILABLE };

/** A short, honest message for a failed call; the backend's own text is never shown. */
function messageFor(error: unknown, fallback: string): string {
  if (error instanceof BackendError) {
    if (error.status === 404) return TOKENS_UNAVAILABLE;
    if (error.status === 429) return RATE_LIMITED;
  }
  return fallback;
}

export interface McpTokensApi {
  /** Null while the first load is in flight. An empty list when none, or when loading failed. */
  tokens: McpTokenItem[] | null;
  create: (
    name: string,
    anonymize: boolean,
    expiryDays: number,
    allowStaging: boolean,
  ) => Promise<CreatedTokenResult>;
  revoke: (id: string) => Promise<void>;
  contextPack: (anonymize: boolean) => Promise<{ pack: unknown; markdown: string }>;
}

/**
 * MCP token management through the same-origin `/api` proxy (session auth): list on mount,
 * create (with the opt-in `allowStaging`, which adds `write:stage`), revoke and the context pack.
 * Failures throw an Error whose message is safe to show.
 */
export function useMcpTokens(): McpTokensApi {
  const [tokens, setTokens] = useState<McpTokenItem[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    apiFetchAll("/mcp-tokens", { signal: controller.signal, schema: McpTokenListResponse })
      .then((list) =>
        setTokens(
          // The card's type spells "no expiry / never used" as null.
          list.map((t) => ({
            ...t,
            expiresAt: t.expiresAt ?? null,
            lastUsedAt: t.lastUsedAt ?? null,
          })),
        ),
      )
      .catch(() => {
        if (!controller.signal.aborted) setTokens([]);
      });
    return () => controller.abort();
  }, []);

  const create = useCallback<McpTokensApi["create"]>(
    async (name, anonymize, expiryDays, allowStaging) => {
      try {
        const created: CreatedTokenResult = await apiFetch("/mcp-tokens", {
          method: "POST",
          schema: CreateMcpTokenResponse,
          body: { name, expiryDays, anonymizeInstitutions: anonymize, allowStaging },
        });
        // Keep the shared list current, so what depends on it (the Imports link once a token can
        // stage) shows without a reload. While the list is still loading it stays null: the card
        // is keyed on loaded versus loading, and a remount would lose the token shown only once.
        setTokens(
          (prev) =>
            prev && [
              {
                id: created.id,
                name: created.name,
                tokenPrefix: created.tokenPrefix,
                scopes: created.scopes,
                anonymizeInstitutions: created.anonymizeInstitutions,
                expiresAt: created.expiresAt ?? null,
                lastUsedAt: null,
                totalToolCalls: 0,
                createdAt: new Date().toISOString(),
                isRevoked: false,
                isExpired: false,
              },
              ...prev,
            ],
        );
        return created;
      } catch (error) {
        throw new Error(messageFor(error, CREATE_FAILED));
      }
    },
    [],
  );

  const revoke = useCallback<McpTokensApi["revoke"]>(async (id) => {
    try {
      await apiFetch(`/mcp-tokens/${encodeURIComponent(id)}`, {
        method: "DELETE",
        schema: RevokeMcpTokenResponse,
        allowEmpty: true,
      });
      setTokens((prev) => prev?.map((t) => (t.id === id ? { ...t, isRevoked: true } : t)) ?? prev);
    } catch (error) {
      throw new Error(messageFor(error, REVOKE_FAILED));
    }
  }, []);

  const contextPack = useCallback<McpTokensApi["contextPack"]>(
    (anonymize) =>
      apiFetch(`/mcp-tokens/context-pack?anonymize=${anonymize ? "true" : "false"}`, {
        schema: ContextPackResponse,
      }),
    [],
  );

  return { tokens, create, revoke, contextPack };
}
