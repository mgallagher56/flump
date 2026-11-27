// @vitest-environment node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DELETE_ACCOUNT_CONFIRMATION, RECENT_LOGIN_MESSAGE } from "./account";
import { IDENTITY_PENDING_MESSAGE } from "./components/DeleteAccountSection/DeleteAccountSection";

/**
 * The mobile app's "Download your data", "Delete your account" and last-step words are web's
 * (E12 S9, plan 9.10). The app keeps them in `apps/mobile/src/copy/accountData.ts` (its `WEB_*`
 * groups); this test, run by web's suite so a web-only change fails at once, pins them to web's
 * components. Most of web's words are written inline in JSX, so those are found in the component
 * source (whitespace folded, as JSX wraps long lines); the exported constants are compared
 * directly. The mobile file sits outside this project, so it is loaded by path (as
 * `homeCopyParity.test.tsx`).
 */
const MOBILE_SRC = new URL("../../../../mobile/src/", import.meta.url);

interface MobileAccountData {
  DELETE_PHRASE: string;
  WEB_EXPORT: Record<string, string>;
  WEB_DELETE: Record<string, string | readonly string[]>;
  WEB_ACCOUNT_DELETED: Record<string, string>;
  WEB_FINISH_DELETION: Record<string, string>;
  typePhraseLabel(phrase: string): string;
}

const loadMobile = async () =>
  (await import(
    /* @vite-ignore */ fileURLToPath(new URL("copy/accountData.ts", MOBILE_SRC))
  )) as MobileAccountData;

/** A component's source with every run of whitespace folded to one space. */
const source = (component: string) =>
  readFileSync(
    new URL(`./components/${component}/${component}.tsx`, import.meta.url),
    "utf8",
  ).replace(/\s+/g, " ");

/** Each string must appear in the source as written, quoted or as JSX text. */
function expectAllIn(component: string, strings: readonly string[]) {
  const text = source(component);
  const missing = strings.filter((s) => !text.includes(s));
  expect(missing).toEqual([]);
}

describe("the mobile account data words are web's", () => {
  it("the typed phrase and the recent sign-in sentence", async () => {
    const mobile = await loadMobile();
    expect(mobile.DELETE_PHRASE).toBe(DELETE_ACCOUNT_CONFIRMATION);
    expect(mobile.WEB_DELETE.recentLogin).toBe(RECENT_LOGIN_MESSAGE);
    // Web labels the field with a template: `Type ${DELETE_ACCOUNT_CONFIRMATION} to confirm`.
    expect(source("FinishDeletionPanel")).toContain(
      ["label={`Type ", "$", "{DELETE_ACCOUNT_CONFIRMATION} to confirm`}"].join(""),
    );
    expect(mobile.typePhraseLabel(DELETE_ACCOUNT_CONFIRMATION)).toBe(
      `Type ${DELETE_ACCOUNT_CONFIRMATION} to confirm`,
    );
  });

  it("Download your data (DataExportSection)", async () => {
    const { WEB_EXPORT } = await loadMobile();
    expectAllIn("DataExportSection", Object.values(WEB_EXPORT));
  });

  it("Delete your account (DeleteAccountSection)", async () => {
    const { WEB_DELETE } = await loadMobile();
    const { recentLogin, list, ...inline } = WEB_DELETE;
    expect(recentLogin).toBe(RECENT_LOGIN_MESSAGE);
    expectAllIn("DeleteAccountSection", [
      ...Object.values(inline).filter((v): v is string => typeof v === "string"),
      ...(list as readonly string[]),
    ]);
    // "Sign in again" is web's SignInAgainButton.
    expectAllIn("SignInAgainButton", [inline.signInAgain as string]);
  });

  it("the list of what goes is web's, in web's order", async () => {
    const { WEB_DELETE } = await loadMobile();
    const items = [...source("DeleteAccountSection").matchAll(/<li>(.*?)<\/li>/g)].map((m) => m[1]);
    expect(WEB_DELETE.list).toEqual(items);
  });

  it("the deletion confirmation (AccountDeletedNotice)", async () => {
    const { WEB_ACCOUNT_DELETED } = await loadMobile();
    expectAllIn("AccountDeletedNotice", Object.values(WEB_ACCOUNT_DELETED));
  });

  it("the last step (FinishDeletionPanel)", async () => {
    const { WEB_FINISH_DELETION } = await loadMobile();
    expectAllIn("FinishDeletionPanel", Object.values(WEB_FINISH_DELETION));
    // Web's first-attempt words for identity_pending, which the app moves past to the last step.
    expect(IDENTITY_PENDING_MESSAGE).toContain("we could not finish removing your login");
  });
});
