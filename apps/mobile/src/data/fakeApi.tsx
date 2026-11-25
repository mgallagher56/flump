/**
 * Tests only: an in-memory `/v1` behind the real `ApiClient` interface and the real query client,
 * so screens are tested through the same data door the app uses. Lives in `src/data` because only
 * this folder may name `@flump/api-client`. Nothing in the app imports it.
 */
import { type ApiClient, BackendError } from "@flump/api-client";
import type { ReactElement } from "react";
import { ThemeProvider } from "../theme/ThemeProvider";
import { ApiProvider } from "./ApiProvider";
import { createQueryClient } from "./queryClient";

interface FakeCall {
  method: string;
  path: string;
  body: unknown;
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
      options: { method?: string; body?: unknown; schema?: { parse(u: unknown): unknown } | null },
    ) => {
      const method = options.method ?? "GET";
      calls.push({ method, path, body: options.body });
      const route = routes[`${method} ${path}`];
      if (!route) fail("not-found", 404);
      const data = await route(options.body);
      return options.schema ? options.schema.parse(data) : data;
    },
  );
  const client = { request, getClientPolicy: jest.fn() } as unknown as ApiClient;
  return { client, calls, request };
}

/** Wraps a screen in the theme and the data door, with a fresh cache for each test. */
export function withApi(ui: ReactElement, client: ApiClient | null) {
  const queryClient = createQueryClient();
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
