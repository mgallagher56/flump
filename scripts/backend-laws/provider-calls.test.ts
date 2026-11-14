import { describe, expect, test } from "bun:test";
import {
  findProviderCallViolations,
  isCoveredFile,
  scanProviderCode,
} from "./check-provider-calls";

const rules = (source: string) => findProviderCallViolations("x.ts", source).map((v) => v.rule);

describe("bank-provider call law (BE-11, H2, H5)", () => {
  test("flags a bare fetch call", () => {
    expect(rules(`const res = await fetch("https://api.monzo.com/accounts");`)).toEqual([
      "raw-fetch",
    ]);
    expect(rules(`return fetch (url, init);`)).toEqual(["raw-fetch"]);
  });

  test("allows providerFetch, injected fetch and property access", () => {
    expect(rules(`await providerFetch(url, {}, ctx);`)).toEqual([]);
    expect(rules(`await providerFetchJson(url, {}, ctx);`)).toEqual([]);
    expect(rules(`const res = await fetchImpl(url, init);`)).toEqual([]);
    expect(rules(`const f = options.fetchImpl ?? globalThis.fetch;`)).toEqual([]);
    expect(rules(`this.fetch(url)`)).toEqual([]);
  });

  test("flags an empty or comment-only catch", () => {
    expect(rules(`try { a(); } catch (_err) {}`)).toEqual(["swallowed-catch"]);
    expect(rules(`try { a(); } catch {\n  // Fallback to 0 if balance fetch fails\n}`)).toEqual([
      "swallowed-catch",
    ]);
    expect(rules(`try { a(); } catch (err) { throw wrap(err); }`)).toEqual([]);
  });

  test("flags a catch that invents a result", () => {
    expect(rules(`try { a(); } catch (_err) {\n  return [];\n}`)).toEqual(["catch-default"]);
    expect(rules(`try { a(); } catch { return 0; }`)).toEqual(["catch-default"]);
    expect(rules(`const x = await p.catch(() => []);`)).toEqual(["catch-default"]);
    expect(rules(`const x = await p.catch((e) => null);`)).toEqual(["catch-default"]);
    expect(rules(`await res.body?.cancel().catch(() => undefined);`)).toEqual([]);
    expect(rules(`try { a(); } catch (err) { return wrap(err); }`)).toEqual([]);
  });

  test("flags empty-list defaults and global fetch", () => {
    expect(rules(`for (const a of data.accounts || []) {}`)).toEqual(["empty-default"]);
    expect(rules(`const list = body.items ?? [ ];`)).toEqual(["empty-default"]);
    expect(rules(`await globalThis.fetch(url);`)).toEqual(["raw-fetch"]);
  });

  test("flags zero defaults but not other numbers", () => {
    expect(rules(`balance = (balData.balance || 0) / 100;`)).toEqual(["zero-default"]);
    expect(rules(`const n = Number(raw ?? 0);`)).toEqual(["zero-default"]);
    expect(rules(`const ms = options.timeoutMs ?? 8000;`)).toEqual([]);
    expect(rules(`const x = a || 0.5;`)).toEqual([]);
  });

  test("ignores prose in comments", () => {
    expect(rules(`// never call fetch( directly or use || 0`)).toEqual([]);
    expect(rules(` * a failed balance must not become ?? 0 or fetch(`)).toEqual([]);
  });

  test("covers production source only", () => {
    expect(isCoveredFile("apps/backend/src/providers/monzo.provider.ts")).toBe(true);
    expect(isCoveredFile("apps/backend/src/providers/monzo.provider.spec.ts")).toBe(false);
    expect(isCoveredFile("packages/banking/src/server/provider-fetch.test.ts")).toBe(false);
    expect(isCoveredFile("apps/backend/src/providers/__fixtures__/fake-bank.ts")).toBe(false);
    expect(isCoveredFile("packages/banking/src/server/provider-fetch.ts")).toBe(true);
    expect(isCoveredFile("packages/banking/src/server/adapters/csv.ts")).toBe(false);
  });

  test("the provider code on this branch passes", () => {
    expect(scanProviderCode()).toEqual([]);
  });
});
