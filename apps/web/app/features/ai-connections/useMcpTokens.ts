import {
  ContextPackResponse,
  CreateMcpTokenResponse,
  McpTokenListResponse,
  RevokeMcpTokenResponse,
} from "@flump/api-contract";
import { useCallback, useEffect, useRef, useState } from "react";
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

/**
 * Whether a failed create may still have made a token. The backend refused it for certain only
 * when it answered with a 4xx; a timeout, a dropped connection, a 5xx from anything in between
 * or an unreadable 2xx all leave it unknown. Token create takes no idempotency key on purpose
 * (the plaintext token must never be stored for replay), so the list is the only way to find out.
 */
function mayHaveCreated(error: unknown): boolean {
  if (!(error instanceof BackendError)) return true;
  return error.kind === "unavailable" || error.kind === "server" || error.kind === "bad-response";
}

/** The card's type spells "no expiry / never used" as null. */
const toItems = (list: McpTokenListResponse): McpTokenItem[] =>
  list.map((t) => ({ ...t, expiresAt: t.expiresAt ?? null, lastUsedAt: t.lastUsedAt ?? null }));

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

  // Aborted on unmount, so neither the first load nor a later refresh sets state afterwards.
  const unmount = useRef<AbortController | null>(null);
  // Counts the changes made here (a create or a revoke that succeeded). A list read that started
  // before one of them is out of date, so it is read again rather than shown.
  const changes = useRef(0);

  /** Reads the list; `onError` says what a failed read leaves in place. */
  const load = useCallback((signal: AbortSignal, onError: () => void) => {
    const startedAt = changes.current;
    apiFetchAll("/mcp-tokens", { signal, schema: McpTokenListResponse })
      .then((list) => {
        if (signal.aborted) return;
        if (changes.current !== startedAt) load(signal, onError);
        else setTokens(toItems(list));
      })
      .catch(() => {
        if (!signal.aborted) onError();
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    unmount.current = controller;
    load(controller.signal, () => setTokens([]));
    return () => controller.abort();
  }, [load]);

  /**
   * Reads the list again after a create whose outcome is unknown, so a token the backend did
   * make shows up and can be revoked. A failed refresh keeps the list as it was.
   */
  const refreshAfterUnknownCreate = useCallback(() => {
    const signal = unmount.current?.signal;
    if (signal && !signal.aborted) load(signal, () => undefined);
  }, [load]);

  const create = useCallback<McpTokensApi["create"]>(
    async (name, anonymize, expiryDays, allowStaging) => {
      try {
        const created: CreatedTokenResult = await apiFetch("/mcp-tokens", {
          method: "POST",
          schema: CreateMcpTokenResponse,
          body: { name, expiryDays, anonymizeInstitutions: anonymize, allowStaging },
        });
        changes.current++;
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
        if (mayHaveCreated(error)) refreshAfterUnknownCreate();
        throw new Error(messageFor(error, CREATE_FAILED));
      }
    },
    [refreshAfterUnknownCreate],
  );

  const revoke = useCallback<McpTokensApi["revoke"]>(async (id) => {
    try {
      await apiFetch(`/mcp-tokens/${encodeURIComponent(id)}`, {
        method: "DELETE",
        schema: RevokeMcpTokenResponse,
        allowEmpty: true,
      });
      changes.current++;
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
