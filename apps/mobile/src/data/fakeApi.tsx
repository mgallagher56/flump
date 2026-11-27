/**
 * Tests only: an in-memory `/v1` behind the real `ApiClient` interface and the real query client,
 * so screens are tested through the same data door the app uses. Lives in `src/data` because only
 * this folder may name `@flump/api-client`. Nothing in the app imports it.
 */
import { type ApiClient, BackendError } from "@flump/api-client";
import type { QueryClient } from "@tanstack/react-query";
import { cleanup } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { ThemeProvider } from "../theme/ThemeProvider";
import { ApiProvider } from "./ApiProvider";
import { createQueryClient } from "./queryClient";

interface FakeCall {
  method: string;
  path: string;
  body: unknown;
  /** Present only when the call sent `If-Match` (S9's profile saves). */
  ifMatch?: string;
}

/** A route answers with a body, or throws (use `fail`). Keyed "GET /accounts". */
export type FakeRoute = (body: unknown) => unknown | Promise<unknown>;

export function fail(kind: BackendError["kind"], status?: number, code?: string): never {
  const error = new BackendError(kind, "/fake", status);
  if (code) error.code = code;
  throw error;
}

export function fakeApi(routes: Record<string, FakeRoute>) {
  const calls: FakeCall[] = [];
  const request = jest.fn(
    async (
      path: string,
      options: {
        method?: string;
        body?: unknown;
        schema?: { parse(u: unknown): unknown } | null;
        allowEmpty?: boolean;
        ifMatch?: string;
      },
    ) => {
      const method = options.method ?? "GET";
      calls.push({
        method,
        path,
        body: options.body,
        ...(options.ifMatch ? { ifMatch: options.ifMatch } : {}),
      });
      const route = routes[`${method} ${path}`];
      if (!route) fail("not-found", 404);
      const data = await route(options.body);
      // A route that answers nothing is an empty body: allowed only where the caller allows it.
      if (data === undefined && options.allowEmpty) return undefined;
      if (!options.schema) return data;
      // As the real client: an answer its schema refuses is `bad-response` (out of step).
      try {
        return options.schema.parse(data);
      } catch {
        fail("bad-response", 200);
      }
    },
  );
  const client = { request, getClientPolicy: jest.fn() } as unknown as ApiClient;
  return { client, calls, request };
}

const clients = new Set<QueryClient>();

// Each cache is emptied after its test: a query left in it holds a 5 minute garbage-collection
// timer, which kept the Jest process (or worker) from exiting. The screen is unmounted first (if
// RNTL's own clean-up has not done it already), then the cache is cleared, which stops the timers.
// Guarded as RNTL guards its own clean-up, so importing this file outside Jest does not throw.
if (typeof afterEach === "function") {
  afterEach(async () => {
    await cleanup();
    for (const queryClient of clients) queryClient.clear();
    clients.clear();
  });
}

/** The app's query client, made for one test and emptied after it. */
export function testQueryClient(): QueryClient {
  const queryClient = createQueryClient();
  clients.add(queryClient);
  return queryClient;
}

/** Wraps a screen in the theme and the data door, with a fresh cache for each test. */
export function withApi(ui: ReactElement, client: ApiClient | null) {
  const queryClient = testQueryClient();
  return {
    queryClient,
    ui: (
      <ThemeProvider scheme="light">
        <ApiProvider client={client} queryClient={queryClient}>
          {ui}
        </ApiProvider>
      </ThemeProvider>
    ),
  };
}
