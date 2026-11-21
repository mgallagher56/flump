import {
  buildCopiedRecordForTaxYear,
  calculateUKTax,
  getCurrentUKTaxYear,
  getNextTaxYear,
  getPreviousTaxYear,
  getRecordAnnualTotalForTaxYear,
  isRecordActiveInTaxYear,
  type TaxRecord,
} from "@flump/finance-engine";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockRecords: TaxRecord[] = [
  {
    id: "rec-1",
    userId: "user-1",
    name: "Flat rent (2024/25)",
    source: "rental",
    type: "income",
    category: "rental_income",
    amount: 1150,
    frequency: "monthly",
    date: "2024-04-06",
    endDate: "2025-03-31",
    notes: null,
    receiptFilename: null,
    receiptMimeType: null,
    receiptData: null,
    createdAt: "2024-04-06T00:00:00Z",
    updatedAt: "2024-04-06T00:00:00Z",
  },
  {
    id: "rec-2",
    userId: "user-1",
    name: "Service charge (2024/25)",
    source: "rental",
    type: "expense",
    category: "rent_rates_insurance",
    amount: 45.57,
    frequency: "monthly",
    date: "2024-04-06",
    endDate: "2025-03-31",
    notes: null,
    receiptFilename: null,
    receiptMimeType: null,
    receiptData: null,
    createdAt: "2024-04-06T00:00:00Z",
    updatedAt: "2024-04-06T00:00:00Z",
  },
  {
    id: "rec-3",
    userId: "user-1",
    name: "Mortgage Interest (2024/25)",
    source: "rental",
    type: "expense",
    category: "mortgage_interest",
    amount: 545,
    frequency: "monthly",
    date: "2024-04-06",
    endDate: "2025-03-31",
    notes: null,
    receiptFilename: null,
    receiptMimeType: null,
    receiptData: null,
    createdAt: "2024-04-06T00:00:00Z",
    updatedAt: "2024-04-06T00:00:00Z",
  },
  {
    id: "rec-4",
    userId: "user-1",
    name: "Software Consulting Retainer",
    source: "self-employed",
    type: "income",
    category: "self_employed_income",
    amount: 3500,
    frequency: "monthly",
    date: "2024-06-01",
    endDate: null,
    notes: null,
    receiptFilename: null,
    receiptMimeType: null,
    receiptData: null,
    createdAt: "2024-06-01T00:00:00Z",
    updatedAt: "2024-06-01T00:00:00Z",
  },
  {
    id: "rec-5",
    userId: "user-1",
    name: "High-Yield Savings Interest",
    source: "savings",
    type: "income",
    category: "savings_interest",
    amount: 80,
    frequency: "monthly",
    date: "2024-04-06",
    endDate: "2025-03-31",
    notes: null,
    receiptFilename: null,
    receiptMimeType: null,
    receiptData: null,
    createdAt: "2024-04-06T00:00:00Z",
    updatedAt: "2024-04-06T00:00:00Z",
  },
  {
    id: "rec-6",
    userId: "user-1",
    name: "FTSE All-World Dividend",
    source: "savings",
    type: "income",
    category: "dividend_income",
    amount: 600,
    frequency: "annual",
    date: "2024-09-01",
    endDate: null,
    notes: null,
    receiptFilename: null,
    receiptMimeType: null,
    receiptData: null,
    createdAt: "2024-09-01T00:00:00Z",
    updatedAt: "2024-09-01T00:00:00Z",
  },
];

let mockLoaderRecords: TaxRecord[] = mockRecords;
let mockProfileSalary: number | null = 60000;
let mockProfileId: string | undefined;
let mockEmploymentType: string | null = "employed";
let mockTaxRegion: string | null = "ENGLAND";
let mockAccounts: Record<string, unknown>[] = [];
let mockEnabledPages: string[] | null = ["accounts", "budget", "tax"];
let mockDashboardWidgets: string[] | null = ["accounts"];
let mockDashboardWidgetOrder: string[] | null = ["accounts"];
let mockSearch = "";
let mockNoProfile = false;
let mockNoLists = false;
const mockSubmit = vi.fn();
const mockRevalidate = vi.fn();
const mockUpdateProfile = vi.fn(async () => {});
const fetcherData = { current: null as unknown };

vi.mock("react-router", () => ({
  Link: ({ children, to, className }: { children: ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
  useInRouterContext: () => false,
  useSearchParams: () => [new URLSearchParams(mockSearch), vi.fn()],
  useRevalidator: () => ({ revalidate: mockRevalidate, state: "idle" }),
  useLoaderData: () => ({
    records: mockNoLists ? undefined : mockLoaderRecords,
    userProfile: mockNoProfile
      ? undefined
      : {
          id: mockProfileId,
          annualSalary: mockProfileSalary,
          employmentType: mockEmploymentType,
          taxRegion: mockTaxRegion,
          propertyOwnershipShare: 100,
          country: "GB",
          enabledPages: mockEnabledPages,
          dashboardWidgets: mockDashboardWidgets,
          dashboardWidgetOrder: mockDashboardWidgetOrder,
        },
    accounts: mockNoLists ? undefined : mockAccounts,
  }),
  useFetcher: () => ({
    submit: mockSubmit,
    state: "idle",
    data: fetcherData.current,
  }),
}));

vi.mock("~/hooks/useUserProfile", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/hooks/useUserProfile")>()),
  useUserProfile: () => ({ updateProfile: mockUpdateProfile }),
}));

import { expectPageRules } from "@repo/ui/testing";
import { SCOTTISH_BANDS_NOTE } from "~/features/tax/tax-labels";
import TaxContainer, { TAX_UNVERIFIED_LEAD } from "./TaxContainer";

const openDrawer = (name: RegExp) => fireEvent.click(screen.getByRole("button", { name }));
/** The records drawer lists the selected year's records, so it opens on 2024/25. */
const openRecords = () => {
  fireEvent.change(screen.getByLabelText("Tax year"), { target: { value: "2024/25" } });
  openDrawer(/^Records$/);
};
/** Picks an item from a menu opened by the named button. */
const pickFromMenu = async (
  user: ReturnType<typeof userEvent.setup>,
  trigger: string,
  item: string,
) => {
  await user.click(screen.getByRole("button", { name: trigger }));
  await user.click(await screen.findByRole("menuitem", { name: item }));
};

/** Buttons a person can reach without opening a drawer, menu or dialog. */
const firstViewButtons = () => screen.getAllByRole("button");

describe("TaxContainer, opted in", () => {
  it("leads with the h1, year control, one hero and a strip of three KPIs", () => {
    const { container } = render(<TaxContainer />);
    expect(screen.getByRole("heading", { level: 1, name: "Self Assessment" })).toBeDefined();
    expect((screen.getByLabelText("Tax year") as HTMLSelectElement).value).toBe(
      getCurrentUKTaxYear(),
    );
    expect(container.querySelectorAll('[data-tone="hero"]')).toHaveLength(1);
    const hero = container.querySelector('[data-tone="hero"]') as HTMLElement;
    // The hero is the answer the page exists to give, named as an estimate inside the hero.
    expect(hero.textContent).toContain("Estimated bill");
    expect(hero.querySelector("[data-estimate-label]")?.textContent).toBe("Unverified estimate");
    const kpis = screen.getAllByText(/^(Income outside PAYE|Income after expenses|Bill due)\s*$/);
    expect(kpis.map((k) => k.textContent?.trim())).toEqual([
      "Income outside PAYE",
      "Income after expenses",
      "Bill due",
    ]);
  });

  it("meets the page rules in the first view", () => {
    const { container } = render(<TaxContainer />);
    expectPageRules(container, { projectionNotices: 1, maxNotSet: 1 });
    const hero = container.querySelector('[data-testid="hero-figure"]');
    const strip = hero?.parentElement as HTMLElement;
    expectPageRules(strip, { maxFigures: 4 });
  });

  it("has at most 6 buttons in the first view, with one Add income menu", () => {
    render(<TaxContainer />);
    expect(firstViewButtons().length).toBeLessThanOrEqual(6);
    expect(screen.getAllByRole("button", { name: "Add income or expense" })).toHaveLength(1);
    expect(screen.queryByText("Quick add")).toBeNull();
    expect(screen.queryByText(/^Copy from \d{4}/)).toBeNull();
  });

  it("says the Unverified estimate sentence once, in the one notice, and labels the hero", () => {
    const { container } = render(<TaxContainer />);
    // Twice in all: the label inside the hero and the one notice's sentence.
    expect(container.textContent?.match(/Unverified estimate/g)).toHaveLength(2);
    expect(container.querySelectorAll("[data-estimate-label]")).toHaveLength(1);
    const notice = screen.getByRole("note");
    expect(notice.textContent).toContain(TAX_UNVERIFIED_LEAD);
    expect(container.textContent).not.toMatch(/Figures are estimates for guidance only/);
  });

  it("says 2027/28 rates are provisional when that year is chosen", () => {
    const record2027: TaxRecord = {
      ...mockRecords[0],
      id: "rec-2027",
      name: "Flat rent (2027/28)",
      date: "2027-04-06",
      endDate: "2028-03-31",
    };
    mockLoaderRecords = [...mockRecords, record2027];
    try {
      render(<TaxContainer />);
      fireEvent.change(screen.getByLabelText("Tax year"), { target: { value: "2027/28" } });
      expect(screen.getByRole("status").textContent).toContain(
        "2027/28 rates are provisional: announced but not yet confirmed.",
      );
    } finally {
      mockLoaderRecords = mockRecords;
    }
  });

  it("shows the refusal line, not a bill or a crash, for a Scottish taxpayer in 2027/28", () => {
    const record2027: TaxRecord = {
      ...mockRecords[0],
      id: "rec-2027-scot",
      name: "Flat rent (2027/28)",
      date: "2027-04-06",
      endDate: "2028-03-31",
    };
    mockLoaderRecords = [...mockRecords, record2027];
    mockTaxRegion = "SCOTLAND";
    try {
      const { container: page } = render(<TaxContainer />);
      fireEvent.change(screen.getByLabelText("Tax year"), { target: { value: "2027/28" } });
      expect(page.textContent).toContain(
        "Scottish Income Tax rates for 2027/28 are not published yet, so there is no estimate for this year.",
      );
      // One quiet notice per surface: the provisional rates banner gives way to the refusal line.
      expect(page.textContent).not.toContain("2027/28 rates are provisional");
      // The rest of the page still renders: the records drawer and the year by year view.
      expect(screen.getByRole("button", { name: /Records/ })).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: /Year by year/ }));
      expect(within(page).getAllByText("Not available").length).toBeGreaterThan(0);
      expect(
        page.querySelector('[data-testid="tax-year-comparison-refusal"]')?.textContent,
      ).toContain("Scottish Income Tax rates for 2027/28 are not published yet");
    } finally {
      mockLoaderRecords = mockRecords;
      mockTaxRegion = "ENGLAND";
    }
  });

  it("has no next £1,000 explorer, no £100,000 banner and no link away", () => {
    const { container } = render(<TaxContainer />);
    expect(container.querySelector("#tax-pay-planner")).toBeNull();
    expect(container.textContent).not.toMatch(/next £1,000/i);
    expect(container.textContent).not.toContain("£100,000");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("link", { name: /more pay is worth/ })).toBeNull();
  });

  it("shows summary figures without pence and no 0 records badges", () => {
    const { container } = render(<TaxContainer />);
    const firstView = container.querySelector("section[aria-label='Summary']") as HTMLElement;
    expect(firstView.textContent).not.toMatch(/£[\d,]+\.\d{2}/);
    expect(container.textContent).not.toMatch(/\b0 records/);
    for (const row of container.querySelectorAll("li[data-list-row]")) {
      expect(row.textContent).not.toContain("£0");
    }
  });

  it("lists only sources with records in the year", () => {
    render(<TaxContainer />);
    // 2026/27 holds only the open-ended consulting retainer.
    expect(screen.getByTestId("tax-source-self-employed")).toBeDefined();
    expect(screen.queryByTestId("tax-source-paye")).toBeNull();
    expect(screen.queryByTestId("tax-source-rental")).toBeNull();
  });

  it("offers the year's estimate workings in a drawer and saves your figures", () => {
    mockSubmit.mockClear();
    render(<TaxContainer />);
    openDrawer(/How the estimate is worked out/);
    expect(screen.getByRole("heading", { name: "Your figures" })).toBeDefined();
    // The share of a rental property comes from Accounts (owner decision 6): no field, none sent.
    expect(screen.queryByLabelText(/Your share of the rental property/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Save details" }));
    expect(mockSubmit).toHaveBeenCalledWith(
      { intent: "update-profile", annualSalary: "60000" },
      { method: "POST" },
    );
  });

  it("shows the add salary prompt, not £0, when a saved profile has no salary", () => {
    // A profile row (it has an id) with no salary saved: the salary is not known, so the
    // workings show the prompt and the salary field is empty. Saving sends no salary.
    mockSubmit.mockClear();
    mockProfileSalary = null;
    mockProfileId = "profile-1";
    try {
      render(<TaxContainer />);
      openDrawer(/How the estimate is worked out/);
      expect(screen.getAllByText("Add salary").length).toBeGreaterThan(0);
      expect((screen.getByLabelText(/Yearly salary before tax/) as HTMLInputElement).value).toBe(
        "",
      );
      fireEvent.click(screen.getByRole("button", { name: "Save details" }));
      expect(mockSubmit).toHaveBeenCalledWith(
        { intent: "update-profile", annualSalary: "" },
        { method: "POST" },
      );
    } finally {
      mockProfileSalary = 60000;
      mockProfileId = undefined;
    }
  });

  it("adds a record from the Add income menu", async () => {
    const user = userEvent.setup();
    mockSubmit.mockClear();
    render(<TaxContainer />);
    await user.click(screen.getByRole("button", { name: "Add income or expense" }));
    await user.click(await screen.findByRole("menuitem", { name: "Rental income" }));

    const dialog = screen.getByRole("dialog", { name: "Add a record" });
    fireEvent.change(within(dialog).getByLabelText(/^Name/), {
      target: { value: "New flat" },
    });
    fireEvent.change(within(dialog).getByLabelText(/^Amount/), { target: { value: "1500" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add record" }));
    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: "create-transaction",
        name: "New flat",
        amount: "1500",
        source: "rental",
        type: "income",
      }),
      { method: "POST" },
    );
  });

  it("groups the records drawer by income source, in the page's source order", () => {
    const { container } = render(<TaxContainer />);
    openRecords();
    const groups = [...container.querySelectorAll("[data-testid^='tax-records-']")].map((g) =>
      g.getAttribute("data-testid"),
    );
    expect(groups).toEqual([
      "tax-records-self-employed",
      "tax-records-rental",
      "tax-records-savings",
    ]);
    const rental = container.querySelector("[data-testid='tax-records-rental']") as HTMLElement;
    expect(
      within(rental).getByRole("heading", { level: 3, name: "Rental property" }),
    ).toBeDefined();
    expect(within(rental).getByText("Flat rent (2024/25)")).toBeDefined();
    expect(within(rental).queryByText("Software Consulting Retainer")).toBeNull();
  });

  it("links each income source row to its own page on the selected year", () => {
    render(<TaxContainer />);
    fireEvent.change(screen.getByLabelText("Tax year"), { target: { value: "2024/25" } });
    const row = screen.getByTestId("tax-source-rental");
    expect(within(row).getByRole("link").getAttribute("href")).toBe(
      "/app/self-assessment/rental?year=2024-25",
    );
  });

  it("copies last year from the same menu", async () => {
    const user = userEvent.setup();
    render(<TaxContainer />);
    await user.click(screen.getByRole("button", { name: "Add income or expense" }));
    await user.click(await screen.findByRole("menuitem", { name: "Copy from last year" }));
    expect(
      screen.getByRole("dialog", { name: "Copy records from another tax year" }),
    ).toBeDefined();
  });

  it("with no records shows one prompt to add income, no strip and no £0", () => {
    mockLoaderRecords = [];
    const { container, unmount } = render(<TaxContainer />);
    // P54: the page's empty state with its one button, not a "Not set" bill card.
    const empty = screen.getByTestId("tax-empty");
    expect(empty.contains(screen.getByRole("button", { name: "Add income or expense" }))).toBe(
      true,
    );
    expect(container.querySelector('[data-testid="hero-figure"]')).toBeNull();
    expect(screen.queryByText("Not set")).toBeNull();
    expect(container.textContent).not.toContain("£0");
    expect(container.querySelector('[data-tone="hero"]')).toBeNull();
    expect(screen.queryByRole("note")).toBeNull();
    expect(screen.getAllByRole("button", { name: "Add income or expense" })).toHaveLength(1);
    expectPageRules(container, { projectionNotices: 0, maxNotSet: 1 });
    // Only the current tax year is offered.
    const options = Array.from((screen.getByLabelText("Tax year") as HTMLSelectElement).options);
    expect(options.map((o) => o.value)).toEqual([getCurrentUKTaxYear()]);
    unmount();
    mockLoaderRecords = mockRecords;
  });

  it("tax record can be edited from the keyboard", async () => {
    const user = userEvent.setup();
    render(<TaxContainer />);
    openRecords();
    const nameBtn = screen.getByRole("button", { name: "Flat rent (2024/25)" });
    nameBtn.focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("button", { name: "Save changes" })).toBeDefined();
  });

  describe("destructive confirmations", () => {
    it("confirms a record delete by name, then submits", async () => {
      const user = userEvent.setup();
      mockSubmit.mockClear();
      render(<TaxContainer />);
      openRecords();
      await pickFromMenu(user, "Actions for Flat rent (2024/25)", "Delete");
      expect(mockSubmit).not.toHaveBeenCalled();
      expect(screen.getByText("Delete Flat rent (2024/25)?")).toBeDefined();
      fireEvent.click(screen.getByRole("button", { name: "Delete record" }));
      expect(mockSubmit).toHaveBeenCalledWith(
        { intent: "delete-transaction", id: "rec-1" },
        { method: "POST" },
      );
    });

    it("a failed record delete shows the error inline and keeps the dialog open", async () => {
      const user = userEvent.setup();
      fetcherData.current = null;
      const { rerender } = render(<TaxContainer />);
      openRecords();
      await pickFromMenu(user, "Actions for Flat rent (2024/25)", "Delete");
      fireEvent.click(screen.getByRole("button", { name: "Delete record" }));
      fetcherData.current = { success: false, error: "We could not reach the server. Try again." };
      rerender(<TaxContainer />);
      expect(within(screen.getByRole("alertdialog")).getByRole("alert").textContent).toBe(
        "We could not reach the server. Try again.",
      );
      fireEvent.click(screen.getByRole("button", { name: "Delete record" }));
      fetcherData.current = { success: true };
      rerender(<TaxContainer />);
      expect(screen.queryByRole("alertdialog")).toBeNull();
      fetcherData.current = null;
    });

    it("cancelling a record delete submits nothing", async () => {
      const user = userEvent.setup();
      mockSubmit.mockClear();
      render(<TaxContainer />);
      openRecords();
      await pickFromMenu(user, "Actions for Flat rent (2024/25)", "Delete");
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it("confirms a tax year delete, from the menu beside the year, with the count and ids", async () => {
      const user = userEvent.setup();
      mockSubmit.mockClear();
      render(<TaxContainer />);
      fireEvent.change(screen.getByLabelText("Tax year"), { target: { value: "2024/25" } });
      await pickFromMenu(user, "More for 2024/25", "Delete all records for 2024/25");
      const dialog = screen.getByRole("alertdialog");
      expect(dialog.textContent).toContain("Delete all 6 records for 2024/25?");
      expect(dialog.textContent).toContain(
        "Deletes the 6 records dated in 2024/25. Records that started in an earlier year and repeat into this one are kept.",
      );
      expect(dialog.textContent).toContain("cannot be undone");
      fireEvent.click(screen.getByRole("button", { name: "Delete records" }));
      expect(mockSubmit).toHaveBeenCalledWith(
        {
          intent: "delete-tax-year",
          recordIds: JSON.stringify(["rec-1", "rec-2", "rec-3", "rec-4", "rec-5", "rec-6"]),
        },
        { method: "POST" },
      );
    });

    it("hides delete-all for a year whose records all started in an earlier year", () => {
      // 2026/27 lists the two records that started in 2024 and carry on, but none is dated in it.
      render(<TaxContainer />);
      fireEvent.change(screen.getByLabelText("Tax year"), { target: { value: "2026/27" } });
      openDrawer(/^Records$/);
      expect(screen.getByRole("button", { name: "Software Consulting Retainer" })).toBeDefined();
      expect(screen.queryByRole("button", { name: /^More for/ })).toBeNull();
      expect(screen.queryByRole("button", { name: /^Delete all records/ })).toBeNull();
    });

    it("lists records dated outside the years on offer under Other dates, with their actions", async () => {
      const user = userEvent.setup();
      const oldRecord: TaxRecord = {
        ...mockRecords[0],
        id: "rec-old",
        name: "Old invoice",
        frequency: "one-off",
        date: "2019-05-01",
        endDate: null,
      };
      mockLoaderRecords = [...mockRecords, oldRecord];
      const { unmount } = render(<TaxContainer />);
      openRecords();
      expect(screen.getByRole("heading", { name: "Other dates (1)" })).toBeDefined();
      expect(screen.getByRole("table", { name: "Records on other dates" })).toBeDefined();
      await pickFromMenu(user, "Actions for Old invoice", "Delete");
      expect(screen.getByRole("alertdialog").textContent).toContain("Delete Old invoice?");
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      fireEvent.click(screen.getByRole("button", { name: "Old invoice" }));
      expect(screen.getByRole("dialog", { name: "Edit record" })).toBeDefined();
      unmount();
      mockLoaderRecords = mockRecords;
      render(<TaxContainer />);
      openRecords();
      expect(screen.queryByRole("heading", { name: /^Other dates/ })).toBeNull();
    });

    it("never offers a delete-year control for an empty year", () => {
      mockLoaderRecords = [];
      const { unmount } = render(<TaxContainer />);
      expect(screen.queryByRole("button", { name: /^More for/ })).toBeNull();
      unmount();
      mockLoaderRecords = mockRecords;
    });
  });

  describe("stored receipts (E20-N15)", () => {
    const withReceipt: TaxRecord = {
      ...mockRecords[0],
      id: "rec-receipt",
      name: "Flat repairs (2024/25)",
      receiptFilename: "repairs.png",
      receiptMimeType: "image/png",
      hasReceipt: true,
    };
    const lastPayload = () => mockSubmit.mock.calls.at(-1)?.[0] as Record<string, unknown>;

    const openEdit = () => {
      mockLoaderRecords = [withReceipt];
      mockSubmit.mockClear();
      render(<TaxContainer />);
      openRecords();
      fireEvent.click(screen.getByRole("button", { name: "Flat repairs (2024/25)" }));
    };

    it("saves an edit without sending receipt bytes or a clear flag", () => {
      openEdit();
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
      const payload = lastPayload();
      expect(payload.intent).toBe("update-transaction");
      expect(payload.receiptData).toBeUndefined();
      expect(payload.receiptClear).toBeUndefined();
      expect(payload.receiptFilename).toBe("repairs.png");
      mockLoaderRecords = mockRecords;
    });

    it("never sends a missing field as the text 'undefined'", () => {
      openEdit();
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
      const payload = lastPayload();
      for (const value of Object.values(payload)) expect(value).not.toBe("undefined");
      expect("notes" in payload).toBe(false);
      mockLoaderRecords = mockRecords;
    });

    it("keeps the dialog open and says why when a save fails, and closes it on success", () => {
      fetcherData.current = null;
      mockLoaderRecords = [withReceipt];
      mockSubmit.mockClear();
      const { rerender } = render(<TaxContainer />);
      openRecords();
      fireEvent.click(screen.getByRole("button", { name: "Flat repairs (2024/25)" }));
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
      expect(mockSubmit).toHaveBeenCalledTimes(1);
      fetcherData.current = {
        success: false,
        error: "We could not save that. Check the details and try again.",
      };
      rerender(<TaxContainer />);
      expect(screen.getByRole("dialog", { name: "Edit record" })).toBeDefined();
      expect(
        screen
          .getAllByRole("alert")
          .some(
            (a) => a.textContent === "We could not save that. Check the details and try again.",
          ),
      ).toBe(true);
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
      fetcherData.current = { success: true };
      rerender(<TaxContainer />);
      expect(screen.queryByRole("dialog", { name: "Edit record" })).toBeNull();
      fetcherData.current = null;
      mockLoaderRecords = mockRecords;
    });

    it("opens a new dialog without the alert from an earlier failed save", async () => {
      const user = userEvent.setup();
      fetcherData.current = null;
      mockLoaderRecords = [withReceipt];
      const { rerender } = render(<TaxContainer />);
      openRecords();
      fireEvent.click(screen.getByRole("button", { name: "Flat repairs (2024/25)" }));
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
      fetcherData.current = { success: false, error: "We could not save that." };
      rerender(<TaxContainer />);
      const edit = screen.getByRole("dialog", { name: "Edit record" });
      expect(within(edit).getByText("We could not save that.")).toBeDefined();
      fireEvent.click(within(edit).getByRole("button", { name: "Cancel" }));
      expect(screen.queryByText("We could not save that.")).toBeNull();
      await user.click(screen.getByRole("button", { name: "Add income or expense" }));
      await user.click(await screen.findByRole("menuitem", { name: "Rental income" }));
      const add = screen.getByRole("dialog", { name: "Add a record" });
      expect(within(add).queryByRole("alert")).toBeNull();
      expect(screen.queryByText("We could not save that.")).toBeNull();
      fetcherData.current = null;
      mockLoaderRecords = mockRecords;
    });

    it("says so explicitly when the receipt is removed", () => {
      openEdit();
      fireEvent.click(screen.getByRole("button", { name: "Remove receipt" }));
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
      const payload = lastPayload();
      expect(payload.receiptClear).toBe("1");
      expect(payload.receiptData).toBeUndefined();
      expect(payload.receiptFilename).toBeUndefined();
      mockLoaderRecords = mockRecords;
    });

    it("views the receipt through the receipt route, never an inline data URL", async () => {
      const user = userEvent.setup();
      mockLoaderRecords = [withReceipt];
      const { container } = render(<TaxContainer />);
      openRecords();
      await pickFromMenu(user, "Actions for Flat repairs (2024/25)", "View receipt");
      const img = document.body.querySelector('img[src="/app/tax/receipts/rec-receipt"]');
      expect(img).not.toBeNull();
      expect(container.innerHTML + document.body.innerHTML).not.toContain("data:");
      mockLoaderRecords = mockRecords;
    });
  });

  it("shows no Unverified estimate notice for a year with costs only", () => {
    const start = getCurrentUKTaxYear().split("/")[0];
    mockLoaderRecords = [
      { ...mockRecords[1], id: "rec-cost-only", date: `${start}-04-06`, endDate: null },
    ];
    const { container, unmount } = render(<TaxContainer />);
    expect(container.textContent).not.toMatch(/Unverified estimate/);
    expectPageRules(container, { projectionNotices: 0, maxNotSet: 1 });
    unmount();
    mockLoaderRecords = mockRecords;
  });

  it("files a record dated 1 April under the tax year ending that 5 April", () => {
    // The UK tax year starts on 6 April, so a record dated 1 April 2024 belongs to 2023/24.
    mockLoaderRecords = [{ ...mockRecords[0], id: "rec-apr1", date: "2024-04-01" }];
    const { unmount } = render(<TaxContainer />);
    const options = Array.from((screen.getByLabelText("Tax year") as HTMLSelectElement).options);
    expect(options.map((o) => o.value)).toContain("2023/24");
    expect(options.map((o) => o.value)).not.toContain("2024/25");
    unmount();
    mockLoaderRecords = mockRecords;
  });
});

describe("TaxContainer, not opted in (PAYE only)", () => {
  it("shows one empty state with one button and no £0", () => {
    mockEnabledPages = ["accounts", "budget"];
    const { container, unmount } = render(<TaxContainer />);
    expect(screen.getByRole("heading", { level: 1, name: "Self Assessment" })).toBeDefined();
    expect(container.querySelectorAll("[data-testid='self-assessment-off']")).toHaveLength(1);
    expect(
      screen.getByText(
        "Self Assessment is for income outside PAYE, such as self-employment or rent",
      ),
    ).toBeDefined();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(container.textContent).not.toContain("£");
    expectPageRules(container, { maxFigures: 0, projectionNotices: 0 });
    unmount();
    mockEnabledPages = ["accounts", "budget", "tax"];
  });

  it("treats an unset module list as not opted in", () => {
    mockEnabledPages = [];
    const { unmount } = render(<TaxContainer />);
    expect(screen.getByRole("button", { name: "Turn on Self Assessment" })).toBeDefined();
    unmount();
    mockEnabledPages = ["accounts", "budget", "tax"];
  });

  it("turns the section on with the module toggle's profile update, then reloads", async () => {
    mockEnabledPages = ["accounts", "budget"];
    mockUpdateProfile.mockClear();
    mockRevalidate.mockClear();
    const user = userEvent.setup();
    const { unmount } = render(<TaxContainer />);
    await user.click(screen.getByRole("button", { name: "Turn on Self Assessment" }));
    expect(mockUpdateProfile).toHaveBeenCalledWith({
      enabledPages: ["accounts", "budget", "tax"],
      dashboardWidgets: ["accounts", "tax"],
    });
    // The section order is the user's own, set on the dashboard; a new section goes at the end.
    expect(mockUpdateProfile).not.toHaveBeenCalledWith(
      expect.objectContaining({ dashboardWidgetOrder: expect.anything() }),
    );
    expect(mockRevalidate).toHaveBeenCalled();
    expect(await screen.findByText("Estimated bill")).toBeDefined();
    unmount();
    mockEnabledPages = ["accounts", "budget", "tax"];
  });

  it("keeps stored empty lists empty and only adds tax, as the settings toggle does", async () => {
    mockEnabledPages = [];
    mockDashboardWidgets = [];
    mockDashboardWidgetOrder = [];
    mockUpdateProfile.mockClear();
    const user = userEvent.setup();
    const { unmount } = render(<TaxContainer />);
    await user.click(screen.getByRole("button", { name: "Turn on Self Assessment" }));
    expect(mockUpdateProfile).toHaveBeenCalledWith({
      enabledPages: ["tax"],
      dashboardWidgets: ["tax"],
    });
    unmount();
    mockEnabledPages = ["accounts", "budget", "tax"];
    mockDashboardWidgets = ["accounts"];
    mockDashboardWidgetOrder = ["accounts"];
  });

  it("uses the toggle's profile default only for an absent list", async () => {
    mockEnabledPages = null;
    mockDashboardWidgets = [];
    mockDashboardWidgetOrder = null;
    mockUpdateProfile.mockClear();
    const { DEFAULT_PROFILE } = await import("~/hooks/useUserProfile");
    const user = userEvent.setup();
    const { unmount } = render(<TaxContainer />);
    await user.click(screen.getByRole("button", { name: "Turn on Self Assessment" }));
    expect(mockUpdateProfile).toHaveBeenCalledWith({
      enabledPages: [...DEFAULT_PROFILE.enabledPages, "tax"],
      dashboardWidgets: ["tax"],
    });
    unmount();
    mockEnabledPages = ["accounts", "budget", "tax"];
    mockDashboardWidgets = ["accounts"];
    mockDashboardWidgetOrder = ["accounts"];
  });
});

describe("Tax helpers", () => {
  describe("Tax Helper Utilities", () => {
    it("correctly identifies previous and next tax years", () => {
      expect(getPreviousTaxYear("2025/26")).toBe("2024/25");
      expect(getNextTaxYear("2024/25")).toBe("2025/26");
      expect(getNextTaxYear("2025/26")).toBe("2026/27");
    });

    it("calculates annual total and activity in a tax year for recurring records", () => {
      const rentalRec = mockRecords[0]; // £1,150/mo for 12 months
      expect(getRecordAnnualTotalForTaxYear(rentalRec, "2024/25")).toBe(13800);
      expect(isRecordActiveInTaxYear(rentalRec, "2024/25")).toBe(true);
      expect(isRecordActiveInTaxYear(rentalRec, "2022/23")).toBe(false);
    });

    it("shifts dates, names, and applies amount overrides when copying records", () => {
      const source = mockRecords[0];
      const copied = buildCopiedRecordForTaxYear(source, "2025/26", 1200);

      expect(copied.name).toBe("Flat rent (2025/26)");
      expect(copied.date).toBe("2025-04-06");
      expect(copied.endDate).toBe("2026-03-31");
      expect(copied.amount).toBe(1200);
      expect(copied.source).toBe("rental");
      expect(copied.notes).toContain("Copied from 2024/25");
    });

    it("calculates UK tax including Section 24 credit, Personal Savings Allowance and Dividend Allowance", () => {
      const result = calculateUKTax("2024/25", mockRecords, 60000, 100);

      expect(result.rentalIncomeGross).toBe(13800);
      expect(result.rentalMortgageInterest).toBe(6540);
      expect(result.rentalPropertyTaxCredit).toBeGreaterThan(0); // Section 24 20% credit
      expect(result.savingsInterestGross).toBe(960);
      expect(result.dividendIncomeGross).toBe(600);
      // Higher rate taxpayer (salary £60k) has £500 PSA and £500 Dividend Allowance in 2024/25
      expect(result.personalSavingsAllowance).toBe(500);
      expect(result.dividendAllowance).toBe(500);
      expect(result.taxableSavingsInterest).toBe(460); // 960 - 500
      expect(result.taxableDividends).toBe(100); // 600 - 500
      expect(result.netAdditionalTaxToPay).toBeGreaterThan(0);
    });
  });
});

describe("TaxContainer, employment type and region (SA-1, SA-3)", () => {
  const trading: TaxRecord = {
    ...mockRecords[3],
    id: "se-2026",
    name: "Trading income",
    amount: 40000,
    frequency: "annual",
    date: `${getCurrentUKTaxYear().slice(0, 4)}-05-01`,
    endDate: null,
  };

  it("does not pass a self-employed person's profile salary as PAYE pay (same as the Dashboard)", () => {
    // 2026/27: trading income 40,000 less the 1,000 trading allowance = 39,000 profit.
    // Income Tax (39,000 - 12,570) x 20% = 5,286; Class 4 26,430 x 6% = 1,585.80. Total £6,872.
    // With the salary passed as PAYE pay the page showed £15,132.
    mockLoaderRecords = [trading];
    mockEmploymentType = "self-employed";
    mockProfileSalary = 40000;
    try {
      render(<TaxContainer />);
      const summary = screen.getByRole("region", { name: "Summary" });
      expect(summary.textContent).toContain("£6,872");
      expect(summary.textContent).not.toContain("£15,132");
    } finally {
      mockLoaderRecords = mockRecords;
      mockEmploymentType = "employed";
      mockProfileSalary = 60000;
    }
  });

  it("says once that the estimate uses Scottish rates on non-savings income for a Scottish taxpayer", () => {
    mockTaxRegion = "SCOTLAND";
    try {
      render(<TaxContainer />);
      expect(SCOTTISH_BANDS_NOTE).toBe(
        "Uses Scottish rates on salary, self-employed profit and rent. Savings and dividends use UK rates.",
      );
      expect(screen.getAllByText(SCOTTISH_BANDS_NOTE)).toHaveLength(1);
      expect(screen.getAllByRole("note")).toHaveLength(1);
    } finally {
      mockTaxRegion = "ENGLAND";
    }
  });

  it("shows no bands note outside Scotland", () => {
    render(<TaxContainer />);
    expect(screen.queryByText(SCOTTISH_BANDS_NOTE)).toBeNull();
  });
});

describe("TaxContainer, rental shares and calculated figures (slice 7)", () => {
  const year = getCurrentUKTaxYear();
  const start = year.slice(0, 4);
  const rent: TaxRecord = {
    ...mockRecords[0],
    id: "rent-now",
    name: "Flat rent",
    amount: 12000,
    frequency: "annual",
    date: `${start}-04-06`,
    endDate: null,
  };
  const flat = {
    id: "p1",
    name: "Flat 2",
    type: "Property",
    accountSubtype: "rental",
    ownership: "joint",
    sharePercent: 50,
    balance: 230000,
  };
  const withState = (
    records: TaxRecord[],
    accounts: Record<string, unknown>[],
    run: () => void,
  ) => {
    mockLoaderRecords = records;
    mockAccounts = accounts;
    try {
      run();
    } finally {
      mockLoaderRecords = mockRecords;
      mockAccounts = [];
    }
  };

  it("says unlinked rent counts in full when no rental property is saved, in the one notice", () => {
    withState([rent], [], () => {
      render(<TaxContainer />);
      const notes = screen.getAllByRole("note");
      expect(notes).toHaveLength(1);
      expect(notes[0].textContent).toContain(
        "Rental records are counted in full. Add the property in Accounts to set your share.",
      );
      expect(
        within(notes[0]).getByRole("link", { name: "Add the property in Accounts" }),
      ).toHaveProperty("href", expect.stringContaining("/app/accounts"));
    });
  });

  it("asks for links when rental properties have different shares", () => {
    const other = {
      ...flat,
      id: "p2",
      name: "Harbour Street",
      ownership: "sole",
      sharePercent: 100,
    };
    withState([rent], [flat, other], () => {
      render(<TaxContainer />);
      expect(screen.getByRole("note").textContent).toContain(
        "Your rental properties have different shares. Link each rental record to its property so the right share is used.",
      );
    });
  });

  it("says nothing about shares with one rental property, and shows the share it uses", () => {
    withState([rent], [flat], () => {
      render(<TaxContainer />);
      expect(screen.queryByTestId("rental-share-notice")).toBeNull();
      openDrawer(/How the estimate is worked out/);
      expect(screen.getByText("Flat 2. Your share: 50%, from Accounts")).toBeDefined();
    });
  });

  it("offers the calculated buy-to-let interest and adds it as a linked record", () => {
    // 150,000 held all year at 4.5%: 150,000 x 4.5% / 12 x 12 = 6,750.00.
    const balances = Array.from({ length: 12 }, (_, i) => ({
      year: Number(start) + (i < 9 ? 0 : 1),
      month: ((i + 3) % 12) + 1,
      value: -150000,
    }));
    const mortgage = {
      id: "m1",
      name: "Flat 2 mortgage",
      type: "Mortgage",
      accountSubtype: "btl_mortgage",
      interestRate: 4.5,
      balance: -150000,
      details: balances,
    };
    withState([rent], [flat, mortgage], () => {
      mockSubmit.mockClear();
      render(<TaxContainer />);
      const card = screen.getByTestId("calculated-figure-m1");
      expect(card.textContent).toContain(`Estimated mortgage interest for ${year}: £6,750.00`);
      fireEvent.click(within(card).getByRole("button", { name: /^Add this estimate as a record/ }));
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          intent: "create-transaction",
          source: "rental",
          type: "expense",
          category: "mortgage_interest",
          frequency: "annual",
          date: `${start}-04-06`,
          amount: "6750",
          accountId: "m1",
          name: "Flat 2 mortgage interest (estimate)",
          notes: "Estimated from monthly balances",
        }),
        { method: "POST" },
      );
    });
  });
});

describe("TaxContainer, an estimate that cannot be worked out (PR 785 review)", () => {
  const year = getCurrentUKTaxYear();
  const rent: TaxRecord = {
    ...mockRecords[0],
    id: "rent-now",
    name: "Flat rent",
    amount: 10000,
    frequency: "annual",
    date: `${year.slice(0, 4)}-05-01`,
    endDate: null,
  };

  it("self-employed, salary kept, rent but no self-employed record: Not set, never £0", () => {
    // Before: worked from £0 PAYE pay, 10,000 rent less the 1,000 property allowance sits under
    // the 12,570 allowance, so the hero showed a known £0. The Dashboard says unknown.
    mockLoaderRecords = [rent];
    mockEmploymentType = "self-employed";
    mockProfileSalary = 40000;
    try {
      const { container } = render(<TaxContainer />);
      const summary = screen.getByRole("region", { name: "Summary" });
      expect(within(summary).getByText("Not set")).toBeDefined();
      expect(
        within(summary).getByText(
          "Add your self-employed income for this tax year to see an estimated tax bill.",
        ),
      ).toBeDefined();
      expect(
        within(summary).getByRole("button", { name: "Add self-employed income" }),
      ).toBeDefined();
      expect(within(screen.getByTestId("hero-figure")).queryByText("£0")).toBeNull();
      expect(container.textContent).not.toMatch(/Unverified estimate/);
    } finally {
      mockLoaderRecords = mockRecords;
      mockEmploymentType = "employed";
      mockProfileSalary = 60000;
    }
  });

  it("employee with no saved salary and rent: Not set with the add salary link", () => {
    // Before: worked from a stand-in £0 salary. The salary decides the band the rent falls in.
    mockLoaderRecords = [rent];
    mockProfileSalary = null;
    try {
      render(<TaxContainer />);
      const hero = screen.getByTestId("hero-figure");
      expect(within(hero).getByText("Not set")).toBeDefined();
      expect(
        within(hero).getByText(
          "Add your salary to see an estimated tax bill. It decides the tax band your other income falls in.",
        ),
      ).toBeDefined();
      expect(within(hero).getByRole("link", { name: "Add salary" }).getAttribute("href")).toBe(
        "/app/profile#settings-age-and-pay",
      );
    } finally {
      mockLoaderRecords = mockRecords;
      mockProfileSalary = 60000;
    }
  });
});

describe("TaxContainer, what the page decides (E41 M5)", () => {
  const year = getCurrentUKTaxYear();
  const start = year.slice(0, 4);
  const previousYear = getPreviousTaxYear(year);
  const record = (over: Partial<TaxRecord>): TaxRecord => ({
    ...mockRecords[0],
    frequency: "one-off",
    endDate: null,
    ...over,
  });
  const reset = () => {
    mockLoaderRecords = mockRecords;
    mockProfileSalary = 60000;
    mockProfileId = undefined;
    mockEmploymentType = "employed";
    mockTaxRegion = "ENGLAND";
    mockAccounts = [];
    mockEnabledPages = ["accounts", "budget", "tax"];
    mockDashboardWidgets = ["accounts"];
    mockDashboardWidgetOrder = ["accounts"];
    mockSearch = "";
    mockNoProfile = false;
    mockNoLists = false;
    fetcherData.current = null;
    mockSubmit.mockClear();
    mockUpdateProfile.mockClear();
    mockRevalidate.mockClear();
  };
  beforeEach(reset);
  afterEach(reset);

  const salaryField = () => screen.getByLabelText(/Yearly salary before tax/) as HTMLInputElement;
  /** The salary field's figure without its thousands separators. */
  const salaryShown = () => salaryField().value.replace(/,/g, "");

  describe("turning Self Assessment on", () => {
    it("does not add tax twice to a list that already holds it", async () => {
      mockEnabledPages = ["accounts"];
      mockDashboardWidgets = ["accounts", "tax"];
      const user = userEvent.setup();
      render(<TaxContainer />);
      await user.click(screen.getByRole("button", { name: "Turn on Self Assessment" }));
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        enabledPages: ["accounts", "tax"],
        dashboardWidgets: ["accounts", "tax"],
      });
    });

    it("is busy while saving, and says so and frees the button when it fails", async () => {
      mockEnabledPages = ["accounts"];
      let fail: (reason: Error) => void = () => {};
      mockUpdateProfile.mockImplementationOnce(
        () =>
          new Promise<void>((_, reject) => {
            fail = reject;
          }),
      );
      render(<TaxContainer />);
      const button = () => screen.getByRole("button", { name: "Turn on Self Assessment" });
      fireEvent.click(button());
      expect(button().getAttribute("aria-busy")).toBe("true");
      await act(async () => fail(new Error("offline")));
      expect(screen.getByRole("alert").textContent).toBe(
        "We could not turn on Self Assessment. Try again.",
      );
      expect(button().getAttribute("aria-busy")).toBeNull();
      expect(mockRevalidate).not.toHaveBeenCalled();
      // Trying again clears the old error while it saves.
      mockUpdateProfile.mockImplementationOnce(() => new Promise<void>(() => {}));
      fireEvent.click(button());
      await act(async () => {});
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("opens the page after turning it on with no saved profile", async () => {
      mockNoProfile = true;
      const { DEFAULT_PROFILE } = await import("~/hooks/useUserProfile");
      const user = userEvent.setup();
      render(<TaxContainer />);
      await user.click(screen.getByRole("button", { name: "Turn on Self Assessment" }));
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        enabledPages: [...DEFAULT_PROFILE.enabledPages, "tax"],
        dashboardWidgets: [...DEFAULT_PROFILE.dashboardWidgets, "tax"],
      });
      expect(await screen.findByLabelText("Tax year")).toBeDefined();
    });
  });

  it("shows the empty state when the loader sends no records or accounts", () => {
    mockNoLists = true;
    render(<TaxContainer />);
    expect(screen.getByTestId("tax-empty")).toBeDefined();
  });

  it("opens on the year in the link", () => {
    mockSearch = "year=2024-25";
    render(<TaxContainer />);
    expect((screen.getByLabelText("Tax year") as HTMLSelectElement).value).toBe("2024/25");
  });

  describe("the salary in the workings", () => {
    it("takes a newly saved salary, but keeps an unsaved edit", () => {
      const view = render(<TaxContainer />);
      openDrawer(/How the estimate is worked out/);
      expect(salaryShown()).toBe("60000");
      mockProfileSalary = 70000;
      view.rerender(<TaxContainer />);
      expect(salaryShown()).toBe("70000");
      // A second saved change, with no edit in between, replaces it again.
      mockProfileSalary = 72000;
      view.rerender(<TaxContainer />);
      expect(salaryShown()).toBe("72000");
      fireEvent.change(salaryField(), { target: { value: "75000" } });
      mockProfileSalary = 80000;
      view.rerender(<TaxContainer />);
      expect(salaryShown()).toBe("75000");
    });

    it("saves the salary as typed, shows it saving, then shows a failed save on the page", async () => {
      const view = render(<TaxContainer />);
      openDrawer(/How the estimate is worked out/);
      fireEvent.change(salaryField(), { target: { value: "65000" } });
      fireEvent.click(screen.getByRole("button", { name: "Save details" }));
      expect(mockSubmit).toHaveBeenCalledWith(
        { intent: "update-profile", annualSalary: "65000" },
        { method: "POST" },
      );
      expect(screen.getByRole("button", { name: "Saving…" })).toBeDefined();
      await waitFor(
        () => expect(screen.getByRole("button", { name: "Save details" })).toBeDefined(),
        { timeout: 2000 },
      );
      fetcherData.current = { success: false, error: "We could not save your salary." };
      view.rerender(<TaxContainer />);
      expect(screen.getByRole("alert").textContent).toBe("We could not save your salary.");
    });

    it("gives the band line from the estimate's total income, not the salary alone", () => {
      // Salary 60,000 plus 45,000 self-employed income less the 1,000 trading allowance:
      // 60,000 + 45,000 - 1,000 = 104,000 in total, inside the £100,000 to £125,140 band. The
      // salary alone (60,000) would show no line.
      mockLoaderRecords = [
        record({
          id: "se",
          source: "self-employed",
          category: "self_employed_income",
          amount: 45000,
          date: `${start}-05-01`,
        }),
      ];
      render(<TaxContainer />);
      openDrawer(/How the estimate is worked out/);
      expect(
        screen.getByText(
          "Total income in this estimate is £104,000, in the £100,000 to £125,140 band where the Personal Allowance reduces.",
        ),
      ).toBeDefined();
    });
  });

  it("shows the latest records after the loader sends new ones", () => {
    const view = render(<TaxContainer />);
    const options = () =>
      Array.from((screen.getByLabelText("Tax year") as HTMLSelectElement).options).map(
        (o) => o.value,
      );
    expect(options()).not.toContain(previousYear);
    mockLoaderRecords = [
      ...mockRecords,
      record({
        id: "rec-prev",
        name: "Last year's invoice",
        source: "self-employed",
        category: "self_employed_income",
        amount: 5000,
        date: `${previousYear.slice(0, 4)}-06-01`,
      }),
      record({ id: "rec-old", name: "Old invoice", date: "2019-05-01" }),
    ];
    view.rerender(<TaxContainer />);
    expect(options()).toContain(previousYear);
    fireEvent.change(screen.getByLabelText("Tax year"), { target: { value: previousYear } });
    // The new year has an estimate of its own, not an unknown bill.
    expect(within(screen.getByTestId("hero-figure")).queryByText("Not set")).toBeNull();
    openDrawer(/^Records$/);
    expect(screen.getByRole("heading", { name: "Other dates (1)" })).toBeDefined();
  });

  describe("deleting a tax year", () => {
    it("sends only the ids of the records dated in that year", async () => {
      mockLoaderRecords = [
        ...mockRecords,
        record({ id: "rec-25", name: "One-off job", date: "2025-06-01" }),
      ];
      const user = userEvent.setup();
      render(<TaxContainer />);
      fireEvent.change(screen.getByLabelText("Tax year"), { target: { value: "2025/26" } });
      await pickFromMenu(user, "More for 2025/26", "Delete all records for 2025/26");
      fireEvent.click(screen.getByRole("button", { name: "Delete records" }));
      expect(mockSubmit).toHaveBeenCalledWith(
        { intent: "delete-tax-year", recordIds: JSON.stringify(["rec-25"]) },
        { method: "POST" },
      );
    });

    it("shows a failed delete, cancels without sending, opens clean, and closes on success", async () => {
      const user = userEvent.setup();
      const view = render(<TaxContainer />);
      fireEvent.change(screen.getByLabelText("Tax year"), { target: { value: "2024/25" } });
      await pickFromMenu(user, "More for 2024/25", "Delete all records for 2024/25");
      fireEvent.click(screen.getByRole("button", { name: "Delete records" }));
      fetcherData.current = { success: false, error: "We could not delete those records." };
      view.rerender(<TaxContainer />);
      expect(within(screen.getByRole("alertdialog")).getByRole("alert").textContent).toBe(
        "We could not delete those records.",
      );
      mockSubmit.mockClear();
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(screen.queryByRole("alertdialog")).toBeNull();
      expect(mockSubmit).not.toHaveBeenCalled();
      await pickFromMenu(user, "More for 2024/25", "Delete all records for 2024/25");
      expect(within(screen.getByRole("alertdialog")).queryByRole("alert")).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Delete records" }));
      fetcherData.current = { success: true };
      view.rerender(<TaxContainer />);
      expect(screen.queryByRole("alertdialog")).toBeNull();
    });

    it("offers delete-all at the foot of the records too", () => {
      render(<TaxContainer />);
      openRecords();
      fireEvent.click(screen.getByRole("button", { name: "Delete all records for 2024/25" }));
      expect(screen.getByRole("alertdialog").textContent).toContain(
        "Delete all 6 records for 2024/25?",
      );
    });
  });

  it("starts Add an expense on the source of the year's first income outside PAYE", () => {
    mockLoaderRecords = [
      record({
        id: "paye-bonus",
        name: "Bonus",
        source: "paye",
        category: "paye_bonus",
        amount: 1000,
        date: `${start}-05-01`,
      }),
      record({
        id: "fee",
        name: "Platform fee",
        source: "savings",
        type: "expense",
        category: "investment_fees",
        amount: 20,
        date: `${start}-05-01`,
      }),
      record({
        id: "old-interest",
        name: "Old interest",
        source: "savings",
        category: "savings_interest",
        amount: 50,
        date: `${previousYear.slice(0, 4)}-05-01`,
      }),
      record({ id: "rent", name: "Flat rent", amount: 9000, date: `${start}-05-01` }),
    ];
    render(<TaxContainer />);
    fireEvent.click(screen.getByRole("button", { name: "Add an expense" }));
    const dialog = screen.getByRole("dialog", { name: "Add a record" });
    expect((within(dialog).getByLabelText("Income source") as HTMLSelectElement).value).toBe(
      "rental",
    );
    expect((within(dialog).getByLabelText("Type") as HTMLSelectElement).value).toBe("expense");
  });

  it("opens a self-employed income record from the unknown estimate's button", () => {
    mockLoaderRecords = [record({ id: "rent", amount: 10000, date: `${start}-05-01` })];
    mockEmploymentType = "self-employed";
    render(<TaxContainer />);
    fireEvent.click(screen.getByRole("button", { name: "Add self-employed income" }));
    const dialog = screen.getByRole("dialog", { name: "Add a record" });
    expect((within(dialog).getByLabelText("Income source") as HTMLSelectElement).value).toBe(
      "self-employed",
    );
    expect((within(dialog).getByLabelText("Type") as HTMLSelectElement).value).toBe("income");
  });

  it("for a year with costs only, offers no workings, no salary link and no year by year", () => {
    mockLoaderRecords = [
      { ...mockRecords[1], id: "cost-only", date: `${start}-04-06`, endDate: null },
    ];
    render(<TaxContainer />);
    expect(screen.queryByRole("button", { name: /How the estimate is worked out/ })).toBeNull();
    expect(screen.queryByRole("link", { name: "Add salary" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Year by year/ })).toBeNull();
  });

  it("names the buy-to-let mortgages from Accounts while no rent is recorded", () => {
    mockLoaderRecords = [
      record({
        id: "se",
        name: "Design work",
        source: "self-employed",
        category: "self_employed_income",
        amount: 5000,
        date: `${start}-05-01`,
      }),
    ];
    mockAccounts = [
      { id: "m1", name: "Flat 2 mortgage", type: "Mortgage", accountSubtype: "btl_mortgage" },
      { id: "m2", name: "Home loan", type: "Mortgage", accountSubtype: "residential_mortgage" },
      { id: "p1", name: "Flat 2", type: "Property", accountSubtype: "rental" },
      { id: "m3", type: "Mortgage", accountSubtype: "btl_mortgage" },
    ];
    const { container } = render(<TaxContainer />);
    const row = container.querySelector("[data-source='rental']") as HTMLElement;
    expect(row.textContent).toContain("From your accounts: Flat 2 mortgage, Buy-to-let mortgage");
  });

  describe("the records drawer", () => {
    it("is not offered for a year with no records", () => {
      mockLoaderRecords = [record({ id: "old-year", date: "2024-06-01" })];
      render(<TaxContainer />);
      expect(screen.queryByRole("button", { name: /^Records$/ })).toBeNull();
    });

    it("still lists records on other dates, with an add button in the year's empty table", () => {
      mockLoaderRecords = [record({ id: "rec-old", name: "Old invoice", date: "2019-05-01" })];
      render(<TaxContainer />);
      openDrawer(/^Records$/);
      expect(screen.getByRole("heading", { name: "Other dates (1)" })).toBeDefined();
      fireEvent.click(screen.getByRole("button", { name: "Add record" }));
      const dialog = screen.getByRole("dialog", { name: "Add a record" });
      expect((within(dialog).getByLabelText("Income source") as HTMLSelectElement).value).toBe(
        "self-employed",
      );
    });
  });

  it("shows £0 PAYE salary year by year when a salary is saved, and asks for it when none is", () => {
    const selfEmployed = () => {
      mockEmploymentType = "self-employed";
      mockLoaderRecords = [
        record({
          id: "se-now",
          source: "self-employed",
          category: "self_employed_income",
          amount: 20000,
          date: `${start}-05-01`,
        }),
        record({
          id: "se-prev",
          source: "self-employed",
          category: "self_employed_income",
          amount: 20000,
          date: `${previousYear.slice(0, 4)}-05-01`,
        }),
      ];
    };
    const salaryRow = () =>
      screen.getByText("Salary through PAYE").closest("tr") as HTMLTableRowElement;
    selfEmployed();
    const saved = render(<TaxContainer />);
    openDrawer(/Year by year/);
    expect(salaryRow().textContent).toContain("£0");
    saved.unmount();
    mockProfileSalary = null;
    render(<TaxContainer />);
    openDrawer(/Year by year/);
    expect(salaryRow().textContent).not.toContain("£0");
  });

  it("closes the copy dialog", async () => {
    const user = userEvent.setup();
    render(<TaxContainer />);
    await user.click(screen.getByRole("button", { name: "Add income or expense" }));
    await user.click(await screen.findByRole("menuitem", { name: "Copy from last year" }));
    const dialog = screen.getByRole("dialog", { name: "Copy records from another tax year" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog", { name: "Copy records from another tax year" })).toBeNull();
  });
});
