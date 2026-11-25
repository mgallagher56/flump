import { BackendError } from "@flump/api-client";
import { classifyApiError } from "./problems";

const err = (kind: BackendError["kind"], code?: string) => {
  const e = new BackendError(kind, "/accounts");
  if (code) e.code = code;
  return e;
};

describe("classifyApiError", () => {
  it("a 403 terms_not_accepted is its own kind (seam for PR #939)", () => {
    expect(classifyApiError(err("forbidden", "terms_not_accepted"))).toBe("termsNotAccepted");
  });
  it("another 403 is not", () => {
    expect(classifyApiError(err("forbidden", "forbidden"))).toBe("other");
  });
  it.each([
    ["not-invited", "notInvited"],
    ["unauthorised", "unauthorised"],
    ["unavailable", "unavailable"],
    ["server", "unavailable"],
    ["client", "other"],
  ] as const)("%s is %s", (kind, problem) => {
    expect(classifyApiError(err(kind))).toBe(problem);
  });
  it("a non-backend error is other", () => {
    expect(classifyApiError(new Error("x"))).toBe("other");
  });
});
