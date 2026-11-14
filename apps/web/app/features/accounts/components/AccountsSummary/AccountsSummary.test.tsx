import { describe, expect, test } from "vitest";
import customRender from "~/testUtils/customRender";
import { AccountsSummary } from "./AccountsSummary";

const stats = {
  assets: 255000,
  liabilities: 100000,
  netWorth: 155000,
  studentLoans: 0,
  liquidCash: 5000,
  weightedAvgApy: 4.25,
};

describe("<AccountsSummary />", () => {
  test("shows one hero for net worth and a four-figure strip", () => {
    const { container, getByText } = customRender(
      <AccountsSummary accountCount={3} allocation={[]} stats={stats} />,
    );
    const text = container.textContent ?? "";
    expect(getByText("Net worth")).toBeDefined();
    expect(text).toContain("£155,000");
    expect(text).toContain("£255,000");
    expect(text).toContain("£100,000");
    expect(text).toContain("4.25%");
    expect(getByText("Where you stand")).toBeDefined();
  });

  test("shows a student loan on its own line, outside the strip", () => {
    const { getByTestId } = customRender(
      <AccountsSummary
        accountCount={2}
        allocation={[]}
        stats={{ ...stats, studentLoans: 40000 }}
      />,
    );
    const line = getByTestId("student-loans-line");
    expect(line.textContent).toContain("Student loans (not in net worth): £40,000");
    expect(line.textContent).toContain("written off");
  });

  test("labels the home estimate inside net worth, and hides it when there is none", () => {
    const { getByTestId, queryByTestId, unmount } = customRender(
      <AccountsSummary
        accountCount={3}
        allocation={[]}
        stats={{ ...stats, homeEstimate: 310000 }}
      />,
    );
    expect(getByTestId("home-estimate-line").textContent).toContain(
      "Home (your estimate): £310,000",
    );
    unmount();
    customRender(<AccountsSummary accountCount={3} allocation={[]} stats={stats} />);
    expect(queryByTestId("home-estimate-line")).toBeNull();
  });

  test("hides the student loan line when there is none", () => {
    const { queryByTestId } = customRender(
      <AccountsSummary accountCount={1} allocation={[]} stats={stats} />,
    );
    expect(queryByTestId("student-loans-line")).toBeNull();
  });

  test("lists where assets sit with a percentage for each type", () => {
    const { getByText, container } = customRender(
      <AccountsSummary
        accountCount={2}
        allocation={[
          { type: "Current", value: 5000, percentage: 25 },
          { type: "Property", value: 15000, percentage: 75 },
        ]}
        stats={stats}
      />,
    );
    expect(getByText("Where your assets sit")).toBeDefined();
    expect(container.textContent).toContain("75%");
  });
});
