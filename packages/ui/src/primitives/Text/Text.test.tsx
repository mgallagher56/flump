import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Text } from "./Text";

describe("Text", () => {
  it("renders a paragraph by default", () => {
    render(<Text>Your money, in plain English</Text>);
    expect(screen.getByText("Your money, in plain English").tagName).toBe("P");
  });

  it("renders the element given by `as`", () => {
    render(<Text as="span">Inline</Text>);
    expect(screen.getByText("Inline").tagName).toBe("SPAN");
  });

  it("applies different classes for colour and tabular variants", () => {
    render(
      <>
        <Text>plain</Text>
        <Text color="danger" tabular>
          £1,234
        </Text>
      </>,
    );
    expect(screen.getByText("£1,234").className).not.toBe(screen.getByText("plain").className);
  });

  it("passes through ARIA and id attributes", () => {
    render(
      <Text aria-live="polite" id="note">
        Saved
      </Text>,
    );
    const el = screen.getByText("Saved");
    expect(el.getAttribute("aria-live")).toBe("polite");
    expect(el.id).toBe("note");
  });

  it("merges a custom className", () => {
    render(<Text className="custom">Hello</Text>);
    expect(screen.getByText("Hello").className).toContain("custom");
  });
});
