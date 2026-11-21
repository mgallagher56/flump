import { afterEach, describe, expect, it } from "vitest";
import { RUNWAY_STORAGE_KEY } from "./runwayStorage";
import { clearUserStorage, watchLogoutForms } from "./userStorage";

describe("userStorage retired key and early listening", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    window.localStorage.clear();
  });

  it("clearUserStorage also removes the retired v1 baseline key", () => {
    window.localStorage.setItem("flump_financial_baseline_v1", "{}");
    clearUserStorage();
    expect(window.localStorage.getItem("flump_financial_baseline_v1")).toBeNull();
  });

  it("still wipes when a handler on the way stops the submit event bubbling", () => {
    window.localStorage.setItem(RUNWAY_STORAGE_KEY, "{}");
    const stop = watchLogoutForms();
    document.body.innerHTML =
      '<div id="wrap"><form id="out" method="post" action="/logout"></form></div>';
    document.getElementById("wrap")?.addEventListener("submit", (e) => e.stopPropagation());
    document
      .getElementById("out")
      ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    expect(window.localStorage.getItem(RUNWAY_STORAGE_KEY)).toBeNull();
    stop();
  });

  it("stops wiping once the watcher is removed", () => {
    const stop = watchLogoutForms();
    stop();
    window.localStorage.setItem(RUNWAY_STORAGE_KEY, "{}");
    document.body.innerHTML = '<form id="out" method="post" action="/logout"></form>';
    document
      .getElementById("out")
      ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    expect(window.localStorage.getItem(RUNWAY_STORAGE_KEY)).not.toBeNull();
  });
});
