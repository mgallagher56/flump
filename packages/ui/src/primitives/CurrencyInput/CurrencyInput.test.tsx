import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { CurrencyInput } from "./CurrencyInput";
import {
  formatCurrencyInput,
  parseCurrencyInput,
  roundToDecimals,
  roundToPennies,
} from "./parseCurrency";

describe("parseCurrencyInput", () => {
  it.each([
    ["", null],
    ["   ", null],
    ["12", 12],
    ["1,234.5", 1234.5],
    ["1,234.50", 1234.5],
    ["£1,234", 1234],
    ["0", 0],
    ["12.", 12],
    [".5", 0.5],
    ["-50", -50],
    ["abc", null],
    ["12abc", null],
    ["1,2,3", null],
    ["1.2.3", null],
    ["-", null],
    [".", null],
  ])("parses %j as %j", (raw, expected) => {
    expect(parseCurrencyInput(raw)).toBe(expected);
  });

  it.each([
    // Two thousands groups: 1 million, 234 thousand and 567.
    ["1,234,567", 1234567],
    // Pence with no pounds, two digits: 55p.
    [".55", 0.55],
    // The largest whole number a double holds exactly (2^53 - 1) is still a number.
    ["9,007,199,254,740,991", 9007199254740991],
  ])("parses %j as %j", (raw, expected) => {
    expect(parseCurrencyInput(raw)).toBe(expected);
  });

  it.each([
    // Exponent and plus-sign forms are not en-GB money text, even where Number() would read them.
    ".5e3",
    "+.5",
  ])("does not read %j as a number", (raw) => {
    expect(parseCurrencyInput(raw)).toBeNull();
  });
});

describe("roundToPennies and roundToDecimals", () => {
  it("keeps the sign of a negative amount", () => {
    // |-12.5| x 100 = 1250, already whole, / 100 = 12.5, sign restored: -12.5.
    expect(roundToPennies(-12.5)).toBe(-12.5);
    // |-2.25| x 10 = 22.5, rounds half up to 23, / 10 = 2.3, sign restored: -2.3.
    expect(roundToDecimals(-2.25, 1)).toBe(-2.3);
  });

  it("gives plain 0, not negative zero, for a negative amount that rounds away", () => {
    // |-0.004| x 100 = 0.4 rounds to 0; the result must be +0.
    expect(Object.is(roundToPennies(-0.004), 0)).toBe(true);
    // |-0.04| x 10 = 0.4 rounds to 0; the result must be +0.
    expect(Object.is(roundToDecimals(-0.04, 1), 0)).toBe(true);
  });
});

describe("CurrencyInput", () => {
  it("uses decimal input mode and a £ prefix", () => {
    const { container } = render(<CurrencyInput aria-label="Balance" value={null} />);
    expect(screen.getByLabelText("Balance").getAttribute("inputmode")).toBe("decimal");
    expect(container.querySelector("span[aria-hidden='true']")?.textContent).toBe("£");
  });

  it("reports parsed numbers", () => {
    const onValueChange = vi.fn();
    render(<CurrencyInput aria-label="Balance" onValueChange={onValueChange} />);
    const input = screen.getByLabelText("Balance");
    fireEvent.change(input, { target: { value: "1,234.5" } });
    expect(onValueChange).toHaveBeenLastCalledWith(1234.5);
    fireEvent.change(input, { target: { value: "12" } });
    expect(onValueChange).toHaveBeenLastCalledWith(12);
  });

  it("reports null for empty and never coerces to 0", () => {
    const onValueChange = vi.fn();
    render(<CurrencyInput aria-label="Balance" onValueChange={onValueChange} value={50} />);
    const input = screen.getByLabelText("Balance") as HTMLInputElement;
    expect(input.value).toBe("50");
    fireEvent.change(input, { target: { value: "" } });
    expect(onValueChange).toHaveBeenLastCalledWith(null);
    expect(input.value).toBe("");
  });

  it("starts empty for null and undefined values", () => {
    const { rerender } = render(<CurrencyInput aria-label="Balance" value={null} />);
    expect((screen.getByLabelText("Balance") as HTMLInputElement).value).toBe("");
    rerender(<CurrencyInput aria-label="Balance" value={undefined} />);
    expect((screen.getByLabelText("Balance") as HTMLInputElement).value).toBe("");
  });

  it("rejects non-numeric characters", () => {
    const onValueChange = vi.fn();
    render(<CurrencyInput aria-label="Balance" onValueChange={onValueChange} />);
    const input = screen.getByLabelText("Balance") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "abc" } });
    expect(onValueChange).not.toHaveBeenCalled();
    expect(input.value).toBe("");
  });

  it("keeps in-progress text such as '12.' while the value matches", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <CurrencyInput aria-label="Balance" onValueChange={onValueChange} value={null} />,
    );
    const input = screen.getByLabelText("Balance") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "12." } });
    rerender(<CurrencyInput aria-label="Balance" onValueChange={onValueChange} value={12} />);
    expect(input.value).toBe("12.");
  });

  it("follows external value changes and formats on blur", () => {
    const { rerender } = render(<CurrencyInput aria-label="Balance" value={10} />);
    const input = screen.getByLabelText("Balance") as HTMLInputElement;
    rerender(<CurrencyInput aria-label="Balance" value={2500} />);
    expect(input.value).toBe("2,500");
    fireEvent.change(input, { target: { value: "1234.5" } });
    fireEvent.blur(input);
    expect(input.value).toBe("1,234.5");
  });

  it("calls a supplied onBlur", () => {
    const onBlur = vi.fn();
    render(<CurrencyInput aria-label="Balance" onBlur={onBlur} />);
    fireEvent.blur(screen.getByLabelText("Balance"));
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});

describe("CurrencyInput min and max", () => {
  it("clamps on blur and emits the settled value", () => {
    const onValueChange = vi.fn();
    render(<CurrencyInput aria-label="Balance" max={1000} min={0} onValueChange={onValueChange} />);
    const input = screen.getByLabelText("Balance") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "£1,250" } });
    expect(onValueChange).toHaveBeenLastCalledWith(1250);
    fireEvent.blur(input);
    expect(input.value).toBe("1,000");
    expect(onValueChange).toHaveBeenLastCalledWith(1000);
  });
});

describe("formatCurrencyInput", () => {
  it.each([
    [Number.NaN, ""],
    [Number.POSITIVE_INFINITY, ""],
    [Number.NEGATIVE_INFINITY, ""],
    [-0, "0"],
    [-0.001, "0"],
    [0.004, "0"],
    [1234.5, "1,234.5"],
    [-1234.567, "-1,234.57"],
  ])("formats %s as %j", (value, expected) => {
    expect(formatCurrencyInput(value)).toBe(expected);
  });
});

describe("CurrencyInput edge cases", () => {
  it.each([Number.NaN, Number.POSITIVE_INFINITY])("shows an empty field for %s", (value) => {
    render(<CurrencyInput aria-label="Balance" value={value} />);
    expect((screen.getByLabelText("Balance") as HTMLInputElement).value).toBe("");
  });

  it("shows 0 for -0 and sub-penny values", () => {
    const { rerender } = render(<CurrencyInput aria-label="Balance" value={-0} />);
    expect((screen.getByLabelText("Balance") as HTMLInputElement).value).toBe("0");
    rerender(<CurrencyInput aria-label="Balance" value={-0.001} />);
    expect((screen.getByLabelText("Balance") as HTMLInputElement).value).toBe("0");
  });

  it("rounds to 2dp on blur and emits the rounded value", () => {
    const onValueChange = vi.fn();
    render(<CurrencyInput aria-label="Balance" onValueChange={onValueChange} />);
    const input = screen.getByLabelText("Balance") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1,234.567" } });
    expect(onValueChange).toHaveBeenLastCalledWith(1234.567);
    fireEvent.blur(input);
    expect(input.value).toBe("1,234.57");
    expect(onValueChange).toHaveBeenLastCalledWith(1234.57);
  });

  it("does not re-emit on blur when rounding changes nothing", () => {
    const onValueChange = vi.fn();
    render(<CurrencyInput aria-label="Balance" onValueChange={onValueChange} />);
    const input = screen.getByLabelText("Balance");
    fireEvent.change(input, { target: { value: "12.5" } });
    onValueChange.mockClear();
    fireEvent.blur(input);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("calls onInvalid for non-empty text that fails to parse, not for empty or valid text", () => {
    const onInvalid = vi.fn();
    const onValueChange = vi.fn();
    render(
      <CurrencyInput aria-label="Balance" onInvalid={onInvalid} onValueChange={onValueChange} />,
    );
    const input = screen.getByLabelText("Balance");
    fireEvent.change(input, { target: { value: "1.2.3" } });
    expect(onInvalid).toHaveBeenCalledWith("1.2.3");
    expect(onValueChange).toHaveBeenLastCalledWith(null);
    onInvalid.mockClear();
    fireEvent.change(input, { target: { value: "12" } });
    fireEvent.change(input, { target: { value: "" } });
    expect(onInvalid).not.toHaveBeenCalled();
  });
});

describe("grouping while typing (R2-5)", () => {
  it("shows thousands separators as the figure is typed and reports the number", () => {
    const onValueChange = vi.fn();
    render(<CurrencyInput aria-label="Balance" onValueChange={onValueChange} value={null} />);
    const input = screen.getByRole("textbox", { name: "Balance" }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1234" } });
    expect(input.value).toBe("1,234");
    expect(onValueChange).toHaveBeenLastCalledWith(1234);
    fireEvent.change(input, { target: { value: "1,2345" } });
    expect(input.value).toBe("12,345");
    expect(onValueChange).toHaveBeenLastCalledWith(12345);
  });

  it("keeps a trailing point and the pence typed so far", () => {
    render(<CurrencyInput aria-label="Balance" value={null} />);
    const input = screen.getByRole("textbox", { name: "Balance" }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1234." } });
    expect(input.value).toBe("1,234.");
    fireEvent.change(input, { target: { value: "1,234.5" } });
    expect(input.value).toBe("1,234.5");
  });
});

describe("typing a decimal figure key by key (R2-5)", () => {
  /** Inserts each character at the caret, as a browser does, and fires one change per key. */
  const typeKeys = (input: HTMLInputElement, keys: string) => {
    for (const key of keys) {
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? start;
      const value = input.value.slice(0, start) + key + input.value.slice(end);
      fireEvent.change(input, { target: { value } });
    }
  };

  it("keeps the point and the pence", () => {
    const onValueChange = vi.fn();
    render(<CurrencyInput aria-label="Balance" onValueChange={onValueChange} value={null} />);
    const input = screen.getByRole("textbox", { name: "Balance" }) as HTMLInputElement;
    input.focus();
    typeKeys(input, "3412.50");
    expect(input.value).toBe("3,412.50");
    expect(onValueChange).toHaveBeenLastCalledWith(3412.5);
  });
});

describe("deleting beside a thousands comma (R2-5)", () => {
  const setup = () => {
    const onValueChange = vi.fn();
    render(<CurrencyInput aria-label="Balance" onValueChange={onValueChange} value={1234} />);
    const input = screen.getByRole("textbox", { name: "Balance" }) as HTMLInputElement;
    input.focus();
    return { input, onValueChange };
  };

  it("Backspace just after the comma deletes the digit before it", () => {
    const { input, onValueChange } = setup();
    expect(input.value).toBe("1,234");
    // "1,|234" + Backspace removes the comma in the raw value; the caret sits where it was.
    input.setSelectionRange(1, 1);
    fireEvent.change(input, { target: { value: "1234", selectionStart: 1 } });
    expect(input.value).toBe("234");
    expect(onValueChange).toHaveBeenLastCalledWith(234);
  });
});

describe("a comma used as a decimal point (R2-5)", () => {
  it("is not read as a different number", () => {
    const onValueChange = vi.fn();
    const onInvalid = vi.fn();
    render(
      <CurrencyInput
        aria-label="Balance"
        onInvalid={onInvalid}
        onValueChange={onValueChange}
        value={null}
      />,
    );
    const input = screen.getByRole("textbox", { name: "Balance" }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1" } });
    fireEvent.change(input, { target: { value: "1," } });
    fireEvent.change(input, { target: { value: "1,5" } });
    expect(input.value).toBe("1,5");
    expect(onValueChange).not.toHaveBeenLastCalledWith(15);
  });
});

describe("leading zero handling", () => {
  it("strips leading zeros when typing non-zero digits into a 0 field without breaking 0.50", () => {
    const onValueChange = vi.fn();
    render(<CurrencyInput aria-label="Balance" onValueChange={onValueChange} value={0} />);
    const input = screen.getByRole("textbox", { name: "Balance" }) as HTMLInputElement;
    expect(input.value).toBe("0");

    fireEvent.change(input, { target: { value: "08", selectionStart: 2 } });
    expect(input.value).toBe("8");
    expect(onValueChange).toHaveBeenLastCalledWith(8);

    fireEvent.change(input, { target: { value: "840", selectionStart: 3 } });
    expect(input.value).toBe("840");
    expect(onValueChange).toHaveBeenLastCalledWith(840);

    fireEvent.change(input, { target: { value: "0840", selectionStart: 4 } });
    expect(input.value).toBe("840");

    fireEvent.change(input, { target: { value: "00", selectionStart: 2 } });
    expect(input.value).toBe("0");
    expect(onValueChange).toHaveBeenLastCalledWith(0);

    fireEvent.change(input, { target: { value: "0.", selectionStart: 2 } });
    expect(input.value).toBe("0.");
    fireEvent.change(input, { target: { value: "0.50", selectionStart: 4 } });
    expect(input.value).toBe("0.50");
    expect(onValueChange).toHaveBeenLastCalledWith(0.5);
  });
});

describe("the caret while typing", () => {
  const focused = (value: number) => {
    render(<CurrencyInput aria-label="Balance" value={value} />);
    const input = screen.getByRole("textbox", { name: "Balance" }) as HTMLInputElement;
    input.focus();
    return input;
  };

  it("stays after the digit just typed when regrouping adds a comma before it", () => {
    const input = focused(123456);
    expect(input.value).toBe("123,456");
    // "|123,456" + "9" gives "9|123,456", which regroups to "9|,123,456": still 1 from the start.
    fireEvent.change(input, { target: { value: "9123,456", selectionStart: 1, selectionEnd: 1 } });
    expect(input.value).toBe("9,123,456");
    expect(input.selectionStart).toBe(1);
  });

  it("stays after the digit just typed when a leading zero is dropped", () => {
    const input = focused(0.5);
    expect(input.value).toBe("0.5");
    // "0|.5" + "7" gives "07|.5"; dropping the zero leaves "7|.5", so the caret is 1 from the start.
    fireEvent.change(input, { target: { value: "07.5", selectionStart: 2, selectionEnd: 2 } });
    expect(input.value).toBe("7.5");
    expect(input.selectionStart).toBe(1);
  });

  it("stays at the start each time a 0 typed there is dropped and the text is unchanged", () => {
    const input = focused(5000);
    expect(input.value).toBe("5,000");
    for (let i = 0; i < 2; i += 1) {
      // "|5,000" + "0" gives "0|5,000"; dropping the zero leaves "|5,000" again.
      fireEvent.change(input, { target: { value: "05,000", selectionStart: 1, selectionEnd: 1 } });
      expect(input.value).toBe("5,000");
      expect(input.selectionStart).toBe(0);
    }
  });
});

describe("more than one leading zero", () => {
  it("drops all of them", () => {
    const onValueChange = vi.fn();
    render(<CurrencyInput aria-label="Balance" onValueChange={onValueChange} value={0} />);
    const input = screen.getByRole("textbox", { name: "Balance" }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "0084", selectionStart: 4 } });
    expect(input.value).toBe("84");
    expect(onValueChange).toHaveBeenLastCalledWith(84);
  });
});

describe("editing around a thousands comma (R2-5)", () => {
  const setup = (value: number | null) => {
    const onValueChange = vi.fn();
    const onInvalid = vi.fn();
    render(
      <CurrencyInput
        aria-label="Balance"
        onInvalid={onInvalid}
        onValueChange={onValueChange}
        value={value}
      />,
    );
    const input = screen.getByRole("textbox", { name: "Balance" }) as HTMLInputElement;
    input.focus();
    return { input, onValueChange, onInvalid };
  };

  it("Delete just before the comma deletes the digit after it", () => {
    const { input, onValueChange } = setup(1234);
    // "1|,234" + Delete removes the comma in the raw value; the person meant the 2.
    input.setSelectionRange(1, 1);
    fireEvent.input(input, {
      target: { value: "1234", selectionStart: 1, selectionEnd: 1 },
      inputType: "deleteContentForward",
    });
    expect(input.value).toBe("134");
    expect(onValueChange).toHaveBeenLastCalledWith(134);
  });

  it("a digit typed just before a comma is kept", () => {
    const { input, onValueChange } = setup(12345);
    // "1|2,345" + "9" gives "19|2,345" -> 192,345.
    fireEvent.change(input, { target: { value: "192,345", selectionStart: 2, selectionEnd: 2 } });
    expect(input.value).toBe("192,345");
    expect(onValueChange).toHaveBeenLastCalledWith(192345);
  });

  it("typing over a digit and its comma keeps the new digit", () => {
    const { input, onValueChange } = setup(1234);
    // Select "1," in "1,234" and type 9: "9|234" -> 9,234.
    fireEvent.change(input, { target: { value: "9234", selectionStart: 1, selectionEnd: 1 } });
    expect(input.value).toBe("9,234");
    expect(onValueChange).toHaveBeenLastCalledWith(9234);
  });

  it("typing over a comma and the digit after it with that same digit keeps the number", () => {
    const { input, onValueChange } = setup(1234);
    // Select ",2" in "1,234" and type 2: "12|34" regroups to 1,234.
    fireEvent.change(input, { target: { value: "1234", selectionStart: 2, selectionEnd: 2 } });
    expect(input.value).toBe("1,234");
    expect(onValueChange).toHaveBeenLastCalledWith(1234);
  });

  it("a comma typed at the start stays as typed and is reported", () => {
    const { input, onInvalid, onValueChange } = setup(1234);
    fireEvent.change(input, { target: { value: ",1,234", selectionStart: 1, selectionEnd: 1 } });
    expect(input.value).toBe(",1,234");
    expect(onInvalid).toHaveBeenLastCalledWith(",1,234");
    expect(onValueChange).toHaveBeenLastCalledWith(null);
  });

  it("Backspace on a stray comma at the start removes only that comma", () => {
    const { input, onValueChange } = setup(null);
    fireEvent.change(input, { target: { value: ",234", selectionStart: 4, selectionEnd: 4 } });
    expect(input.value).toBe(",234");
    // ",|234" + Backspace leaves "|234".
    fireEvent.change(input, { target: { value: "234", selectionStart: 0, selectionEnd: 0 } });
    expect(input.value).toBe("234");
    expect(onValueChange).toHaveBeenLastCalledWith(234);
  });
});

/** A parent that stores whatever the field reports, starting at 12. */
const ControlledBalance = () => {
  const [value, setValue] = useState<number | null>(12);
  return <CurrencyInput aria-label="Balance" onValueChange={setValue} value={value} />;
};

describe("following the value from the parent", () => {
  it("empties the field when the parent clears the value to null", () => {
    const { rerender } = render(<CurrencyInput aria-label="Balance" value={50} />);
    const input = screen.getByRole("textbox", { name: "Balance" }) as HTMLInputElement;
    expect(input.value).toBe("50");
    rerender(<CurrencyInput aria-label="Balance" value={null} />);
    expect(input.value).toBe("");
  });

  it("keeps text that is not a number when the parent stores the null it was given", () => {
    render(<ControlledBalance />);
    const input = screen.getByRole("textbox", { name: "Balance" }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "12.3." } });
    expect(input.value).toBe("12.3.");
  });
});

describe("whitespace only", () => {
  it("counts as empty, not as invalid", () => {
    const onInvalid = vi.fn();
    const onValueChange = vi.fn();
    render(
      <CurrencyInput aria-label="Balance" onInvalid={onInvalid} onValueChange={onValueChange} />,
    );
    fireEvent.change(screen.getByLabelText("Balance"), { target: { value: "  " } });
    expect(onInvalid).not.toHaveBeenCalled();
    expect(onValueChange).toHaveBeenLastCalledWith(null);
  });
});

describe("with no callbacks supplied", () => {
  it("handles typing, invalid text, rounding and blur without an error", () => {
    const errors: unknown[] = [];
    const onError = (event: ErrorEvent) => {
      errors.push(event.error);
      event.preventDefault();
    };
    window.addEventListener("error", onError);
    try {
      render(<CurrencyInput aria-label="Balance" />);
      const input = screen.getByRole("textbox", { name: "Balance" }) as HTMLInputElement;
      fireEvent.change(input, { target: { value: "abc" } });
      fireEvent.change(input, { target: { value: "1.2.3" } });
      // 1.234 rounds to 1.23 on blur, so the settled value differs from what was typed.
      fireEvent.change(input, { target: { value: "1.234" } });
      fireEvent.blur(input);
      expect(input.value).toBe("1.23");
    } finally {
      window.removeEventListener("error", onError);
    }
    expect(errors).toEqual([]);
  });
});
