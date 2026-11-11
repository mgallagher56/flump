import { screen } from "@testing-library/react";
import { vi } from "vitest";
import customRender from "~/testUtils/customRender";

import FLPSelect from "./FLPSelect";

const mockSelectioOptions = {
  items: ["1", "2", "3"].map((item) => ({ id: item, name: item })),
};

const describedText = (el: HTMLElement) =>
  (el.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .map((id) => document.getElementById(id)?.textContent)
    .join(" ")
    .trim();

describe("<FLPSelect />", () => {
  test("should render as expected", () => {
    const { baseElement } = customRender(
      <FLPSelect
        collection={mockSelectioOptions}
        label="label"
        value={["1"]}
        onValueChange={vi.fn()}
      />,
    );
    expect(baseElement).toMatchSnapshot();
  });
  test("should render as expected as row", () => {
    const { baseElement } = customRender(
      <FLPSelect
        collection={mockSelectioOptions}
        flexDirection="row"
        label="label"
        value={["1"]}
        onValueChange={vi.fn()}
      />,
    );
    expect(baseElement).toMatchSnapshot();
  });

  const renderSelect = (props: Record<string, unknown> = {}) =>
    customRender(
      <FLPSelect
        collection={mockSelectioOptions}
        label="Amount"
        value={["1"]}
        onValueChange={vi.fn()}
        {...props}
      />,
    );

  test("uses the input boundary token", () => {
    renderSelect();
    expect(screen.getByRole("combobox").className).toContain("bd-c_border.input");
  });

  test("two selects with the same label get distinct ids", () => {
    customRender(
      <>
        <FLPSelect
          collection={mockSelectioOptions}
          label="Amount"
          value={["1"]}
          onValueChange={vi.fn()}
        />
        <FLPSelect
          collection={mockSelectioOptions}
          label="Amount"
          value={["1"]}
          onValueChange={vi.fn()}
        />
      </>,
    );
    const selects = screen.getAllByLabelText("Amount");
    expect(selects).toHaveLength(2);
    expect(selects[0].id).not.toBe(selects[1].id);
  });

  test("error is the accessible description", () => {
    renderSelect({ error: "Required" });
    const select = screen.getByRole("combobox");
    expect(describedText(select)).toBe("Required");
    expect(select.getAttribute("aria-invalid")).toBe("true");
  });

  test("error is announced and uses the danger token", () => {
    renderSelect({ error: "Required" });
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("Required");
    expect(alert.className).toContain("c_status.danger.text");
  });

  test("hidden label keeps a name", () => {
    renderSelect({ isLabelHidden: true });
    expect(screen.getByRole("combobox", { name: "Amount" })).toBeDefined();
  });
});
