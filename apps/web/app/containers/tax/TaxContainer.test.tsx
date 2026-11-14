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
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

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
const mockProfileSalary: number | null = 60000;
let mockEnabledPages: string[] | null = ["accounts", "budget", "tax"];
let mockDashboardWidgets: string[] | null = ["accounts"];
let mockDashboardWidgetOrder: string[] | null = ["accounts"];
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
  useRevalidator: () => ({ revalidate: mockRevalidate, state: "idle" }),
  useLoaderData: () => ({
    records: mockLoaderRecords,
    userProfile: {
      annualSalary: mockProfileSalary,
      propertyOwnershipShare: 100,
      country: "GB",
      enabledPages: mockEnabledPages,
      dashboardWidgets: mockDashboardWidgets,
      dashboardWidgetOrder: mockDashboardWidgetOrder,
    },
    accounts: [],
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
import TaxContainer, { TAX_UNVERIFIED_LEAD } from "./TaxContainer";

const openDrawer = (name: RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const openRecords = () => openDrawer(/^All records/);

/** Buttons a person can reach without opening a drawer, menu or dialog. */
const firstViewButtons = () => screen.getAllByRole("button");

describe("TaxContainer, opted in", () => {
  it("leads with the h1, year control, one hero and two KPIs", () => {
    const { container } = render(<TaxContainer />);
    expect(screen.getByRole("heading", { level: 1, name: "Self Assessment" })).toBeDefined();
    expect((screen.getByLabelText("Tax year") as HTMLSelectElement).value).toBe(
      getCurrentUKTaxYear(),
    );
    expect(container.querySelectorAll('[data-tone="hero"]')).toHaveLength(1);
    const hero = container.querySelector('[data-tone="hero"]') as HTMLElement;
    expect(hero.textContent).toContain(`Income for ${getCurrentUKTaxYear()}`);
    expect(hero.textContent).not.toMatch(/estimate/i);
    // The estimate is the first KPI, marked as one.
    const kpis = screen.getAllByText(/^(Estimated bill|Bill due)$/);
    expect(kpis.map((k) => k.textContent)).toEqual(["Estimated bill", "Bill due"]);
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
    expect(screen.getAllByRole("button", { name: "Add income" })).toHaveLength(1);
    expect(screen.queryByText("Quick add")).toBeNull();
    expect(screen.queryByText(/^Copy from \d{4}/)).toBeNull();
  });

  it("says Unverified estimate once, in the one notice below the h1", () => {
    const { container } = render(<TaxContainer />);
    expect(container.textContent?.match(/Unverified estimate/g)).toHaveLength(1);
    const notice = screen.getByRole("note");
    expect(notice.textContent).toContain(TAX_UNVERIFIED_LEAD);
    expect(container.textContent).not.toMatch(/Figures are estimates for guidance only/);
  });

  it("has no next £1,000 explorer and no £100,000 banner, only a link to take-home", () => {
    const { container } = render(<TaxContainer />);
    expect(container.querySelector("#tax-pay-planner")).toBeNull();
    expect(container.textContent).not.toMatch(/next £1,000/i);
    expect(container.textContent).not.toContain("£100,000");
    expect(screen.queryByRole("alert")).toBeNull();
    const link = screen.getByRole("link", { name: /more pay is worth/ });
    expect(link.getAttribute("href")).toBe("/app/take-home");
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
    fireEvent.change(screen.getByLabelText(/Your share of the rental property/), {
      target: { value: "50" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save details" }));
    expect(mockSubmit).toHaveBeenCalledWith(
      { intent: "update-profile", annualSalary: "60000", propertyOwnershipShare: "50" },
      { method: "POST" },
    );
  });

  it("adds a record from the Add income menu", async () => {
    const user = userEvent.setup();
    mockSubmit.mockClear();
    render(<TaxContainer />);
    await user.click(screen.getByRole("button", { name: "Add income" }));
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

  it("copies last year from the same menu", async () => {
    const user = userEvent.setup();
    render(<TaxContainer />);
    await user.click(screen.getByRole("button", { name: "Add income" }));
    await user.click(await screen.findByRole("menuitem", { name: "Copy from last year" }));
    expect(
      screen.getByRole("dialog", { name: "Copy records from another tax year" }),
    ).toBeDefined();
  });

  it("with no records shows one prompt to add income, no strip and no £0", () => {
    mockLoaderRecords = [];
    const { container, unmount } = render(<TaxContainer />);
    expect(container.textContent).not.toContain("£0");
    expect(container.querySelector('[data-tone="hero"]')).toBeNull();
    expect(screen.queryByRole("note")).toBeNull();
    expect(screen.getAllByRole("button", { name: "Add income" })).toHaveLength(1);
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
    it("confirms a record delete by name, then submits", () => {
      mockSubmit.mockClear();
      render(<TaxContainer />);
      openRecords();
      fireEvent.click(screen.getByRole("button", { name: "Delete Flat rent (2024/25)" }));
      expect(mockSubmit).not.toHaveBeenCalled();
      expect(screen.getByText("Delete Flat rent (2024/25)?")).toBeDefined();
      fireEvent.click(screen.getByRole("button", { name: "Delete record" }));
      expect(mockSubmit).toHaveBeenCalledWith(
        { intent: "delete-transaction", id: "rec-1" },
        { method: "POST" },
      );
    });

    it("a failed record delete shows the error inline and keeps the dialog open", () => {
      fetcherData.current = null;
      const { rerender } = render(<TaxContainer />);
      openRecords();
      fireEvent.click(screen.getAllByRole("button", { name: /^Delete .*\(2024\/25\)$/ })[0]);
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

    it("cancelling a record delete submits nothing", () => {
      mockSubmit.mockClear();
      render(<TaxContainer />);
      openRecords();
      fireEvent.click(screen.getAllByRole("button", { name: /^Delete .*\(2024\/25\)$/ })[0]);
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it("confirms a tax year delete with the record count and ids", () => {
      mockSubmit.mockClear();
      render(<TaxContainer />);
      fireEvent.change(screen.getByLabelText("Tax year"), { target: { value: "2024/25" } });
      openRecords();
      fireEvent.click(screen.getByRole("button", { name: "Delete all records for 2024/25" }));
      const dialog = screen.getByRole("alertdialog");
      expect(dialog.textContent).toContain("Delete all 6 records for 2024/25?");
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

    it("never offers a delete-year control for an empty year", () => {
      mockLoaderRecords = [];
      const { unmount } = render(<TaxContainer />);
      expect(screen.queryByRole("button", { name: /^Delete all records/ })).toBeNull();
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

    it("views the receipt through the receipt route, never an inline data URL", () => {
      mockLoaderRecords = [withReceipt];
      const { container } = render(<TaxContainer />);
      openRecords();
      fireEvent.click(
        screen.getByRole("button", { name: "View receipt for Flat repairs (2024/25)" }),
      );
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
      dashboardWidgetOrder: ["accounts", "tax"],
    });
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
      dashboardWidgetOrder: ["tax"],
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
      dashboardWidgetOrder: [...DEFAULT_PROFILE.dashboardWidgetOrder, "tax"],
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
