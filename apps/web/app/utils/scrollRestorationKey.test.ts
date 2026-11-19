// @vitest-environment node
import { describe, expect, it } from "vitest";
import { scrollRestorationKey } from "./scrollRestorationKey";

describe("scrollRestorationKey", () => {
  it("keeps React Router's own key for entries made by client navigation", () => {
    expect(
      scrollRestorationKey({ key: "k1a2b3", pathname: "/app/budget", search: "", hash: "" }),
    ).toBe("k1a2b3");
  });

  it("keys the shared 'default' entries by their URL, so two pages never share an offset", () => {
    const accounts = scrollRestorationKey({
      key: "default",
      pathname: "/app/accounts",
      search: "",
      hash: "",
    });
    const skipLink = scrollRestorationKey({
      key: "default",
      pathname: "/app/accounts",
      search: "",
      hash: "#main-content",
    });
    expect(accounts).toBe("default:/app/accounts");
    expect(skipLink).toBe("default:/app/accounts#main-content");
    expect(skipLink).not.toBe(accounts);
  });
});
