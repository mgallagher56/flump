/**
 * A fake bank API for provider tests (audit M23, ruling D11: never a real provider).
 *
 * Routes are matched by method and URL pattern and answer with fixture JSON. A test can make a
 * route fail, once or always, in any of the ways a real provider fails: a status code (with
 * headers such as `Retry-After`), a body that is not JSON, a hang until the caller's deadline
 * aborts it, or a network error. Every call is recorded so tests can count retries.
 *
 * Responses are minimal `Response`-shaped objects whose bodies resolve on the microtask queue,
 * so the suite runs under fake timers without real I/O racing the deadline.
 */

/** Text every failing response body carries (as if echoing a credential); errors must never repeat it. */
// Built at runtime and low-entropy on purpose: it stands in for an echoed credential in tests and
// must not look like a real token to secret scanners.
export const PROVIDER_ECHO_MARKER = ["provider", "body", "echo", "marker"].join("-");

export type FakeBehaviour =
  | { kind: "json"; body: unknown; status?: number; headers?: Record<string, string> }
  | { kind: "status"; status: number; headers?: Record<string, string> }
  | { kind: "raw"; text: string }
  | { kind: "timeout" }
  | { kind: "network" };

export interface FakeRoute {
  key: string;
  method?: "GET" | "POST";
  path: RegExp;
  respond: FakeBehaviour;
}

export interface FakeCall {
  key: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export const json = (body: unknown): FakeBehaviour => ({ kind: "json", body });
export const status = (code: number, headers?: Record<string, string>): FakeBehaviour => ({
  kind: "status",
  status: code,
  headers,
});

function fakeResponse(code: number, text: string, headers?: Record<string, string>): Response {
  return {
    ok: code >= 200 && code < 300,
    status: code,
    headers: new Headers(headers),
    body: null,
    text: () => Promise.resolve(text),
    json: () => Promise.resolve(JSON.parse(text)),
  } as unknown as Response;
}

export interface FakeBank {
  fetch: typeof fetch;
  calls: FakeCall[];
  /** Requests no route matched; a passing test leaves this empty. */
  unmatched: string[];
  callsTo(key: string): FakeCall[];
  /** The next `times` calls to `key` behave as given, then the fixture answers again. */
  failNext(key: string, behaviour: FakeBehaviour, times?: number): void;
  /** Every call to `key` behaves as given. */
  failAlways(key: string, behaviour: FakeBehaviour): void;
}

export function createFakeBank(routes: FakeRoute[]): FakeBank {
  const calls: FakeCall[] = [];
  const unmatched: string[] = [];
  const queued = new Map<string, FakeBehaviour[]>();
  const sticky = new Map<string, FakeBehaviour>();

  const fakeFetch = (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    const route = routes.find((r) => (r.method ?? "GET") === method && r.path.test(url));
    if (!route) {
      unmatched.push(`${method} ${url}`);
      return Promise.reject(new TypeError(`fake bank: no route for ${method} ${url}`));
    }
    calls.push({
      key: route.key,
      method,
      url,
      headers: { ...((init?.headers as Record<string, string> | undefined) ?? {}) },
      body: typeof init?.body === "string" ? init.body : undefined,
    });

    const behaviour = queued.get(route.key)?.shift() ?? sticky.get(route.key) ?? route.respond;
    switch (behaviour.kind) {
      case "json":
        return Promise.resolve(
          fakeResponse(behaviour.status ?? 200, JSON.stringify(behaviour.body), behaviour.headers),
        );
      case "status":
        return Promise.resolve(
          fakeResponse(behaviour.status, `{"error":"${PROVIDER_ECHO_MARKER}"}`, behaviour.headers),
        );
      case "raw":
        return Promise.resolve(fakeResponse(200, behaviour.text));
      case "network":
        return Promise.reject(new TypeError(`fetch failed ${PROVIDER_ECHO_MARKER}`));
      case "timeout":
        return new Promise((_resolve, reject) => {
          const signal = init?.signal;
          if (!signal) return; // hangs forever: the caller must set a deadline
          signal.addEventListener("abort", () =>
            reject(new DOMException("The operation was aborted.", "AbortError")),
          );
        });
    }
  };

  return {
    fetch: fakeFetch as typeof fetch,
    calls,
    unmatched,
    callsTo: (key) => calls.filter((c) => c.key === key),
    failNext: (key, behaviour, times = 1) => {
      const list = queued.get(key) ?? [];
      for (let i = 0; i < times; i++) list.push(behaviour);
      queued.set(key, list);
    },
    failAlways: (key, behaviour) => {
      sticky.set(key, behaviour);
    },
  };
}
