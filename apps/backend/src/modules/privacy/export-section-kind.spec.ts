import { ACCOUNT_EXPORT_SECTIONS } from "@flump/api-contract";
import { describe, expect, it } from "vitest";
import { EXPORT_SECTION_KIND } from "./account-export.service";
import { USER_DATA_REGISTRY } from "./user-data-registry";

// "Download your data" is offered on the not-invited page and the terms screen only when a "data"
// section has a row. A new registry section must be classified here, or this fails.
describe("EXPORT_SECTION_KIND", () => {
  it("classifies every registry section and every export section, and nothing else", () => {
    const classified = Object.keys(EXPORT_SECTION_KIND).sort();
    expect(USER_DATA_REGISTRY.map((t) => t.key).sort()).toEqual(classified);
    expect(Object.keys(ACCOUNT_EXPORT_SECTIONS).sort()).toEqual(classified);
  });

  it("names the bookkeeping sections in one place", () => {
    const bookkeeping = Object.entries(EXPORT_SECTION_KIND)
      .filter(([, kind]) => kind === "bookkeeping")
      .map(([key]) => key)
      .sort();
    expect(bookkeeping).toEqual([
      "auditEvents",
      "bankOAuthStates",
      "consents",
      "idempotencyKeys",
      "termsAcceptances",
    ]);
  });
});
