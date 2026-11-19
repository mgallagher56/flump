import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeProfile } from "~/hooks/useUserProfile";
import { rootLoaderRouter } from "~/test/rootLoaderRouter";
import { HomeDashboard, type HomeDashboardProps } from "./HomeDashboard";

// The real router: the shared setup stubs Link and revalidation.
vi.mock("react-router", async () => await vi.importActual("react-router"));

// Audit slice 8, link L64 (CS-2, decision 13): the Dashboard's server markup and the hydrated
// page are the same. The setup checklist's dismissed state comes from the saved profile, never
// from browser storage, so a browser that still holds the old flag changes nothing.

const profile = (dismissed: boolean) =>
  normalizeProfile({
    id: "profile-1",
    userId: "user-1",
    firstName: "Alex",
    enabledPages: ["accounts", "budget", "savings"],
    dashboardWidgets: ["accounts", "budget", "savings"],
    setupChecklistCompletedSteps: [],
    setupChecklistDismissed: dismissed,
    onboardingCompleted: true,
    createdAt: "2026-11-01T09:00:00.000Z",
    updatedAt: "2026-11-19T09:00:00.000Z",
  });

const props = (dismissed: boolean): HomeDashboardProps => ({
  userProfile: profile(dismissed),
  checklistProps: {
    hasAccounts: true,
    hasProfile: true,
    hasBudget: false,
    hasMortgageAccount: false,
    hasRunForecast: false,
    completedSteps: [],
    dismissed,
  },
  checkIn: null,
  accountsData: { netWorth: 4200, homeEstimate: 0, accountsCount: 2 },
  budgetData: { budgetKnown: false, monthlyIncome: 0, monthlyExpenses: 0, monthlySurplus: null },
  savingsData: { totalSavingsBalance: 1200, accountsCount: 1 },
  pensionData: {
    totalPensionBalance: 0,
    potsCount: 0,
    employeePercent: null,
    employerPercent: null,
  },
  mortgageData: { mortgageBalance: 0, hasMortgageAccount: false },
  taxData: { estimatedTaxDue: null, recordsCount: 0 },
  debtData: null,
});

const makeRouter = (dismissed: boolean) =>
  rootLoaderRouter(<HomeDashboard {...props(dismissed)} />, {
    user: { id: "user-1" },
    userProfile: profile(dismissed),
  });

/** Server markup, then hydration of that markup; returns both views and any hydration problem. */
async function serverThenHydrated(dismissed: boolean) {
  const html = renderToString(<RouterProvider router={makeRouter(dismissed)} />);
  const container = document.createElement("div");
  container.innerHTML = html;
  const server = {
    checklist: container.querySelectorAll("[data-testid='setup-checklist']").length,
    text: container.textContent,
  };
  document.body.appendChild(container);
  const problems: string[] = [];
  const consoleError = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    problems.push(args.map(String).join(" "));
  });
  let root: ReturnType<typeof hydrateRoot> | undefined;
  await act(async () => {
    root = hydrateRoot(container, <RouterProvider router={makeRouter(dismissed)} />, {
      onRecoverableError: (error) => {
        problems.push(error instanceof Error ? error.message : String(error));
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
  const hydrated = {
    checklist: container.querySelectorAll("[data-testid='setup-checklist']").length,
    text: container.textContent,
  };
  await act(async () => root?.unmount());
  container.remove();
  consoleError.mockRestore();
  return {
    server,
    hydrated,
    problems: problems.filter((p) => /hydrat|did not match|server rendered/i.test(p)),
  };
}

describe("Dashboard first paint equals the hydrated page (L64)", () => {
  afterEach(() => window.localStorage.clear());

  it("shows the checklist on both when the profile says it is open, whatever the browser holds", async () => {
    // An earlier version's browser flag: it no longer hides anything.
    window.localStorage.setItem("flump_setup_checklist_dismissed", "true");
    const { server, hydrated, problems } = await serverThenHydrated(false);
    expect(server.checklist).toBe(1);
    expect(hydrated).toEqual(server);
    expect(problems).toEqual([]);
  });

  it("leaves the checklist out of both when the profile says it was dismissed", async () => {
    const { server, hydrated, problems } = await serverThenHydrated(true);
    expect(server.checklist).toBe(0);
    expect(hydrated).toEqual(server);
    expect(problems).toEqual([]);
  });
});
