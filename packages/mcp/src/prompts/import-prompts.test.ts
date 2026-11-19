import { afterEach, describe, expect, it } from "vitest";
import { connectTestClient, type TestHarness } from "../testing/client.js";
import { emptyUser } from "../testing/personas.js";
import {
  importSpreadsheetText,
  londonMonth,
  monthlyCheckInText,
  previousMonth,
} from "./import-prompts.js";

describe("import prompt text", () => {
  it("pads the previous month to two digits", () => {
    // October's previous month is September, written 09.
    expect(previousMonth("2026-10")).toBe("2026-09");
  });

  it("lists the account types stage_import accepts and keeps to bookkeeping", () => {
    const text = importSpreadsheetText("2026-11");
    expect(text).toContain("Credit Card");
    expect(text).toContain("Student Loan");
    expect(text).toContain("Do not suggest financial actions");
  });

  it("puts each numbered step on its own line", () => {
    expect(importSpreadsheetText("2026-11")).toMatch(/\n2\. Drop every month after 2026-11/);
    expect(monthlyCheckInText("2026-10")).toMatch(/\n2\. Ask me for the 2026-10/);
  });

  it("checks coverage first, never estimates, and claims a save only once committed", () => {
    const text = monthlyCheckInText("2026-10");
    expect(text).toContain("get_data_coverage");
    expect(text).toContain("Do not estimate or carry values forward");
    expect(text).toContain("saved only if status is committed");
  });
});

describe("monthly-check-in month argument", () => {
  let h: TestHarness | undefined;
  afterEach(async () => {
    await h?.close();
    h = undefined;
  });
  const get = async (month: string) => {
    const { messages } = await (h as TestHarness).client.getPrompt({
      name: "monthly-check-in",
      arguments: { month },
    });
    return messages.map((m) => (m.content.type === "text" ? m.content.text : "")).join();
  };

  it("accepts the current month and October", async () => {
    h = await connectTestClient(emptyUser);
    const current = londonMonth();
    expect(await get(current)).toContain(`balances for ${current}`);
    expect(await get("2025-10")).toContain("balances for 2025-10");
  });

  it("ignores a month with text in front of it", async () => {
    h = await connectTestClient(emptyUser);
    const last = previousMonth(londonMonth());
    const text = await get("1 2025-06");
    expect(text).toContain(`balances for ${last}`);
    expect(text).not.toContain("1 2025-06");
  });
});
