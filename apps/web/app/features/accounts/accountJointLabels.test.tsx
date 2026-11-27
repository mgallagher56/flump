import type { ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";
import AccountDetailContainer from "~/containers/accounts/accountDetailContainer/AccountDetailContainer";
import customRender from "~/testUtils/customRender";

const mocks = vi.hoisted(() => ({ mockUseLoaderData: vi.fn() }));

vi.mock("react-router", async () => {
  const actual: Record<string, unknown> = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: mocks.mockUseLoaderData,
    useRouteLoaderData: () => undefined,
    useRevalidator: () => ({ revalidate: vi.fn() }),
    useFetcher: () => ({ submit: vi.fn(), state: "idle", data: null, Form: "form" }),
    useNavigate: () => vi.fn(),
    Link: ({ to, children, ...rest }: { to: string; children: ReactNode }) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
  };
});

vi.mock("~/hooks/useFormatCurrency", () => ({
  useFormatCurrency: () => ({
    formatCurrency: (val: number) => `£${val?.toLocaleString("en-GB")}`,
  }),
}));

vi.mock("recharts", async () => {
  const actual = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div style={{ width: 400, height: 200 }}>{children}</div>
    ),
  };
});

/**
 * A joint account's own page (owner decision 9 A, ruled by the fable decider in E12 S6): the hero
 * is the user's share, so the whole is said beside it, and the balance history, which is the whole
 * account each month, says so with the share. An account held alone shows neither line.
 */

const renderAccount = (account: Record<string, unknown>, accountDetails: unknown[] = []) => {
  mocks.mockUseLoaderData.mockReturnValue({
    account: { id: "a1", ...account },
    accountDetails,
    goal: null,
  });
  return customRender(<AccountDetailContainer />);
};

const OCTOBER = [{ month: 10, year: 2025, value: 900 }];

describe("a joint account's page says the whole beside the share", () => {
  test("the hero's line gives the share and the whole balance", () => {
    // Saved 1,000 joint at 50%: the hero shows 1,000 x 50% = 500, its line the whole £1,000.
    const { getByTestId } = renderAccount({
      name: "Joint saver",
      type: "Saving",
      balance: 1000,
      ownership: "joint",
      sharePercent: 50,
    });
    const hero = getByTestId("hero-figure");
    expect(hero.textContent).toContain("£500");
    expect(hero.textContent).toContain("Your 50% share. The whole balance is £1,000.");
  });

  test("a joint debt's line gives the whole amount owed", () => {
    // Saved -200,000 joint at 40%: the hero owes 200,000 x 40% = 80,000; the whole is £200,000.
    const { getByTestId } = renderAccount({
      name: "Home loan",
      type: "Mortgage",
      balance: -200000,
      ownership: "joint",
      sharePercent: 40,
    });
    const hero = getByTestId("hero-figure");
    expect(hero.textContent).toContain("£80,000");
    expect(hero.textContent).toContain("Your 40% share. The whole amount owed is £200,000.");
  });

  test("the balance history says it is the whole account, with the share", () => {
    const { getByText, queryByText } = renderAccount(
      { name: "Joint saver", type: "Saving", balance: 1000, ownership: "joint", sharePercent: 50 },
      OCTOBER,
    );
    expect(
      getByText("The whole balance each month, as recorded. Your share is 50% of it.").textContent,
    ).toBe("The whole balance each month, as recorded. Your share is 50% of it.");
    expect(queryByText("This account's balance each month, as recorded.")).toBeNull();
  });

  test("an account held alone shows neither line", () => {
    const { getByTestId, getByText } = renderAccount(
      { name: "Saver", type: "Saving", balance: 1000 },
      OCTOBER,
    );
    expect(getByTestId("hero-figure").textContent).not.toContain("share");
    expect(getByText("This account's balance each month, as recorded.").textContent).toBe(
      "This account's balance each month, as recorded.",
    );
  });
});
