/**
 * Tests only: an in-memory `/v1` behind the real `ApiClient` interface and the real query client,
 * so screens are tested through the same data door the app uses. Lives in `src/data` because only
 * this folder may name `@flump/api-client`. Nothing in the app imports it.
 */
import { type ApiClient, BackendError } from "@flump/api-client";
import {
  CreateAccountRequest,
  CreateBudgetEntryRequest,
  CreateMortgageWithPropertyRequest,
  UpdateAccountRequest,
  UpdateBudgetEntryRequest,
  UpdateProfileRequest,
  UpsertSnapshotRequest,
} from "@flump/api-contract";
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
  /** Present only when the call named its own `Idempotency-Key` (S8's account adds). */
  idempotencyKey?: string;
}

/** A route answers with a body, or throws (use `fail`). Keyed "GET /accounts". */
export type FakeRoute = (body: unknown) => unknown | Promise<unknown>;

export function fail(kind: BackendError["kind"], status?: number, code?: string): never {
  const error = new BackendError(kind, "/fake", status);
  if (code) error.code = code;
  throw error;
}

/**
 * The backend's strict request schemas for the writes the app sends, by method and path. The fake
 * refuses a body the backend would refuse (as a 400), so a test cannot pass on a body the real
 * contract rejects.
 */
const REQUEST_SCHEMAS: Readonly<Record<string, { safeParse(u: unknown): { success: boolean } }>> = {
  "POST /budget-entries": CreateBudgetEntryRequest,
  "PATCH /budget-entries/:id": UpdateBudgetEntryRequest,
  "POST /accounts": CreateAccountRequest,
  "POST /accounts/mortgage-with-property": CreateMortgageWithPropertyRequest,
  "PATCH /accounts/:id": UpdateAccountRequest,
  "PATCH /user-profile": UpdateProfileRequest,
  "PUT /snapshots/:id": UpsertSnapshotRequest,
};

/** "PATCH /accounts/:id" for "PATCH /accounts/abc": the route's shape, by plain string steps. */
function routeShape(method: string, path: string): string {
  const [, first = "", second, ...rest] = path.split("/");
  if (rest.length > 0) return `${method} ${path}`;
  if (second === undefined) return `${method} /${first}`;
  const named = `${method} /${first}/${second}`;
  return named in REQUEST_SCHEMAS ? named : `${method} /${first}/:id`;
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
        idempotencyKey?: string | false;
      },
    ) => {
      const method = options.method ?? "GET";
      calls.push({
        method,
        path,
        body: options.body,
        ...(options.ifMatch ? { ifMatch: options.ifMatch } : {}),
        ...(options.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : {}),
      });
      const schema = REQUEST_SCHEMAS[routeShape(method, path)];
      if (schema && !schema.safeParse(options.body).success)
        fail("client", 400, "validation_failed");
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
export function withApi(
  ui: ReactElement,
  client: ApiClient | null,
  queryClient: ReturnType<typeof testQueryClient> = testQueryClient(),
) {
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
