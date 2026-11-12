import { ONBOARDING_SEED_STORAGE_KEY, setStorageDriver } from "@flump/finance-engine";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FINANCIAL_BASELINE_STORAGE_KEY } from "~/state/baseline.store";
import { RUNWAY_STORAGE_KEY } from "./runwayStorage";
import { clearUserStorage, USER_STORAGE_KEYS, watchLogoutForms } from "./userStorage";

describe("userStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(FINANCIAL_BASELINE_STORAGE_KEY, '{"annualGrossSalary":50000}');
    window.localStorage.setItem("flump_financial_baseline_v1", "{}");
    window.localStorage.setItem(RUNWAY_STORAGE_KEY, "{}");
    window.localStorage.setItem("flump_setup_checklist_dismissed", "true");
    window.localStorage.setItem(ONBOARDING_SEED_STORAGE_KEY, "seed");
    window.localStorage.setItem("flump-theme", "dark");
  });

  afterEach(() => {
    setStorageDriver(null);
    document.body.innerHTML = "";
  });

  it("clearUserStorage removes every per-user key and the seed but keeps the theme", () => {
    expect(USER_STORAGE_KEYS).toContain(FINANCIAL_BASELINE_STORAGE_KEY);
    clearUserStorage();
    for (const key of USER_STORAGE_KEYS) expect(window.localStorage.getItem(key)).toBeNull();
    expect(window.localStorage.getItem(ONBOARDING_SEED_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem("flump-theme")).toBe("dark");
  });

  it("wipes on a logout form submit and leaves other forms alone", () => {
    const stop = watchLogoutForms();
    document.body.innerHTML =
      '<form id="other" action="/app/accounts"></form><form id="out" method="post" action="/logout"></form>';
    const submit = (id: string) =>
      document
        .getElementById(id)
        ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    submit("other");
    expect(window.localStorage.getItem(RUNWAY_STORAGE_KEY)).not.toBeNull();

    submit("out");
    expect(window.localStorage.getItem(RUNWAY_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(FINANCIAL_BASELINE_STORAGE_KEY)).toBeNull();

    stop();
    window.localStorage.setItem(RUNWAY_STORAGE_KEY, "{}");
    submit("out");
    expect(window.localStorage.getItem(RUNWAY_STORAGE_KEY)).not.toBeNull();
  });
});
