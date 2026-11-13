import { describe, expect, test } from "vitest";
import customRender from "~/testUtils/customRender";
import { ChartTooltip } from "./ChartTooltip";

const payload = [
  { dataKey: "netWorth", name: "Net worth", value: 48250, color: "var(--colors-chart-primary)" },
  {
    dataKey: "projection",
    name: "Projection",
    value: 52100,
    color: "var(--colors-chart-projection)",
    strokeDasharray: "6 6",
  },
];

describe("ChartTooltip", () => {
  test("renders nothing when inactive or empty", () => {
    const inactive = customRender(<ChartTooltip active={false} label="Mar" payload={payload} />);
    expect(inactive.container.textContent).toBe("");
    const empty = customRender(<ChartTooltip active label="Mar" payload={[]} />);
    expect(empty.container.textContent).toBe("");
  });

  test("maps the recharts payload to titled rows with en-GB money", () => {
    const { getByText } = customRender(<ChartTooltip active label="Mar 2026" payload={payload} />);
    expect(getByText("Mar 2026")).toBeDefined();
    expect(getByText("Net worth")).toBeDefined();
    expect(getByText("£48,250")).toBeDefined();
    expect(getByText("£52,100")).toBeDefined();
  });

  test("infers a dashed swatch from strokeDasharray", () => {
    const { container } = customRender(<ChartTooltip active label="Mar" payload={payload} />);
    const swatches = [...container.querySelectorAll("svg")].map((s) =>
      s.getAttribute("data-swatch"),
    );
    expect(swatches).toEqual(["line", "dashed"]);
  });

  test("applies labelFormatter, hiddenKeys and swatch overrides", () => {
    const { getByText, queryByText, container } = customRender(
      <ChartTooltip
        active
        hiddenKeys={["projection"]}
        label={2}
        labelFormatter={(l) => `Month ${l}`}
        payload={payload}
        swatches={{ netWorth: "area" }}
      />,
    );
    expect(getByText("Month 2")).toBeDefined();
    expect(queryByText("Projection")).toBeNull();
    expect(container.querySelector("svg")?.getAttribute("data-swatch")).toBe("area");
  });

  test("reads Not set for missing values, never £0", () => {
    const { getByText, queryByText } = customRender(
      <ChartTooltip
        active
        label="Mar"
        payload={[{ dataKey: "netWorth", name: "Net worth", value: undefined }]}
      />,
    );
    expect(getByText("Not set")).toBeDefined();
    expect(queryByText("£0")).toBeNull();
  });
});
