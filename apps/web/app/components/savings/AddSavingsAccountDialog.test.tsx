import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-router", () => ({
  useFetcher: () => ({
    submit: vi.fn(),
    state: "idle",
  }),
}));

import AddSavingsAccountDialog from "./AddSavingsAccountDialog";

describe("AddSavingsAccountDialog", () => {
  it("renders modal form fields when open", () => {
    render(<AddSavingsAccountDialog isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText("Add Manual Savings Account")).toBeDefined();
    expect(screen.getByLabelText("Account Name")).toBeDefined();
    expect(screen.getByLabelText("Account Type")).toBeDefined();
    expect(screen.getByLabelText("Current Balance (£)")).toBeDefined();
    expect(screen.getByLabelText("Interest rate / AER (%)")).toBeDefined();
    expect(screen.getByLabelText("Regular Monthly Savings Contribution (£/month)")).toBeDefined();
  });
});
