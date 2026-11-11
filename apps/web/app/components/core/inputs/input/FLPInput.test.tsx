import { fireEvent, screen } from "@testing-library/react";
import { vi } from "vitest";
import customRender from "~/testUtils/customRender";

import FLPInput from "./FLPInput";

const onChangeMock = vi.fn();

const describedText = (el: HTMLElement) =>
  (el.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .map((id) => document.getElementById(id)?.textContent)
    .join(" ")
    .trim();

describe("<FLPInput />", () => {
  test("should render as expected", () => {
    const { container } = customRender(<FLPInput label="Test" onChange={onChangeMock} />);
    expect(container).toMatchSnapshot();
  });
  test("should render as expected with error", () => {
    const { container } = customRender(
      <FLPInput error="Error" label="Test" onChange={onChangeMock} />,
    );
    expect(container).toMatchSnapshot();
  });
  test("should render as expected with value", () => {
    const { container } = customRender(
      <FLPInput label="Test" value="Value" onChange={onChangeMock} />,
    );
    expect(container).toMatchSnapshot();
  });
  test("should render as expected with value and error", () => {
    const { container } = customRender(
      <FLPInput error="Error" label="Test" value="Value" onChange={onChangeMock} />,
    );
    expect(container).toMatchSnapshot();
  });
  test("should render as expected without a label", () => {
    const { container } = customRender(
      <FLPInput isLabelHidden label="Test" onChange={onChangeMock} />,
    );
    expect(container).toMatchSnapshot();
  });

  test("should render elements as a row", () => {
    const { container } = customRender(
      <FLPInput flexDirection="row" label="Test" onChange={onChangeMock} />,
    );
    expect(container).toMatchSnapshot();
  });

  test("should change the value when typing", () => {
    const { getByLabelText } = customRender(<FLPInput label="Test" onChange={onChangeMock} />);
    const input = getByLabelText("Test") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Test" } });
    expect(onChangeMock).toHaveBeenCalled();
    expect(input.value).toBe("Test");
  });

  test("uses the input boundary token", () => {
    customRender(<FLPInput label="Test" onChange={onChangeMock} />);
    expect(screen.getByRole("textbox").className).toContain("bd-c_border.input");
  });

  test("two inputs with the same label get distinct ids", () => {
    customRender(
      <>
        <FLPInput label="Amount" onChange={onChangeMock} />
        <FLPInput label="Amount" onChange={onChangeMock} />
      </>,
    );
    const inputs = screen.getAllByLabelText("Amount");
    expect(inputs).toHaveLength(2);
    expect(inputs[0].id).not.toBe(inputs[1].id);
  });

  test("caller id wins", () => {
    customRender(<FLPInput id="mine" label="Amount" onChange={onChangeMock} />);
    expect(screen.getByLabelText("Amount").id).toBe("mine");
  });

  test("error is the accessible description", () => {
    customRender(<FLPInput error="Required" label="Amount" onChange={onChangeMock} />);
    const input = screen.getByRole("textbox");
    expect(describedText(input)).toBe("Required");
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  test("caller aria-describedby is merged with the error id", () => {
    customRender(
      <>
        <span id="hint">Hint text</span>
        <FLPInput aria-describedby="hint" error="Required" label="Amount" />
      </>,
    );
    expect(describedText(screen.getByRole("textbox"))).toBe("Hint text Required");
  });

  test("no aria-invalid without an error", () => {
    customRender(<FLPInput label="Amount" onChange={onChangeMock} />);
    expect(screen.getByRole("textbox").hasAttribute("aria-invalid")).toBe(false);
  });

  test("error is announced and uses the danger token", () => {
    customRender(<FLPInput error="Required" label="Amount" onChange={onChangeMock} />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("Required");
    expect(alert.className).toContain("c_status.danger.text");
  });

  test("hidden label keeps a name", () => {
    customRender(<FLPInput isLabelHidden label="Amount" onChange={onChangeMock} />);
    expect(screen.getByRole("textbox", { name: "Amount" })).toBeDefined();
  });
});
