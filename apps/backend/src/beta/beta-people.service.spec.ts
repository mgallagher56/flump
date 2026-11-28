import { Logger } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryIdentityAdapter, joinName } from "../identity/identity.adapter";
import { BetaPeopleService } from "./beta-people.service";

// Sample people on the reserved example.com domain, built at runtime.
const emailOf = (local: string) => `${local}@${["example", "com"].join(".")}`;

describe("BetaPeopleService.contactsFor", () => {
  let identity: InMemoryIdentityAdapter;
  let people: BetaPeopleService;
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    identity = new InMemoryIdentityAdapter();
    people = new BetaPeopleService(identity);
    warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it("reads each person once by id, with their name and email", async () => {
    identity.emails.set("user_a", emailOf("ada"));
    identity.names.set("user_a", "Ada Lovelace");
    identity.emails.set("user_b", emailOf("bo"));
    const read = vi.spyOn(identity, "getUserContact");
    const contacts = await people.contactsFor(["user_a", "user_b", "user_a"]);
    expect(Object.fromEntries(contacts)).toEqual({
      user_a: { email: emailOf("ada"), name: "Ada Lovelace" },
      user_b: { email: emailOf("bo"), name: null },
    });
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("leaves out an unknown person (an erased account) without a warning", async () => {
    const contacts = await people.contactsFor(["user_gone"]);
    expect(contacts.size).toBe(0);
    expect(warn).not.toHaveBeenCalled();
  });

  it("leaves out a failed or slow read, keeps the rest, and logs a count only", async () => {
    identity.emails.set("user_ok", emailOf("ok"));
    const real = identity.getUserContact.bind(identity);
    vi.spyOn(identity, "getUserContact").mockImplementation(async (id) => {
      if (id === "user_fail") throw new Error(`provider said no for ${emailOf("leak")}`);
      if (id === "user_slow") return new Promise(() => undefined);
      return real(id);
    });
    people.timeoutMs = 20;
    const contacts = await people.contactsFor(["user_fail", "user_slow", "user_ok"]);
    expect([...contacts.keys()]).toEqual(["user_ok"]);
    expect(warn).toHaveBeenCalledWith("beta_people_lookup_failed count=2");
    expect(JSON.stringify(warn.mock.calls)).not.toContain("example");
  });

  it("never has more than five reads in flight", async () => {
    let inFlight = 0;
    let most = 0;
    vi.spyOn(identity, "getUserContact").mockImplementation(async () => {
      inFlight += 1;
      most = Math.max(most, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 1));
      inFlight -= 1;
      return null;
    });
    await people.contactsFor(Array.from({ length: 12 }, (_, i) => `user_${i}`));
    expect(most).toBe(5);
  });
});

describe("joinName", () => {
  it("joins first and last, trims, and is null when both are blank", () => {
    expect(joinName(" Ada ", "Lovelace")).toBe("Ada Lovelace");
    expect(joinName("Ada", null)).toBe("Ada");
    expect(joinName(undefined, "Lovelace")).toBe("Lovelace");
    expect(joinName(" ", "")).toBeNull();
  });
});
