import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import HomeFooter from "./HomeFooter";

vi.mock("react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

describe("HomeFooter", () => {
  it("renders footer columns and calculator links", () => {
    render(<HomeFooter />);

    expect(screen.getByText("Flump")).toBeDefined();
    expect(screen.getByText("Platform")).toBeDefined();
    expect(screen.getByText("Free calculators")).toBeDefined();
    expect(screen.getByText("Account and support")).toBeDefined();

    expect(screen.getByRole("link", { name: "£100k tax trap" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Mortgage vs ISA" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Section 24 landlord" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Snowball vs avalanche" })).toBeDefined();
  });

  it("opens contact feedback modal, accepts input, and submits feedback", () => {
    vi.useFakeTimers();
    render(<HomeFooter />);

    const contactBtn = screen.getByRole("button", { name: /Contact and feedback/i });
    fireEvent.click(contactBtn);

    expect(screen.getByRole("heading", { name: "Contact and feedback" })).toBeDefined();

    const subjectInput = screen.getByPlaceholderText(/e\.g\. Question about £100k tax trap/i);
    const messageInput = screen.getByPlaceholderText(/Tell us what you're trying to model/i);
    const submitBtn = screen.getByRole("button", { name: /Send feedback/i });

    // When message is empty, submit is a no-op
    fireEvent.click(submitBtn);
    expect(screen.queryByText(/Thank you\. Your message has been received\./i)).toBeNull();

    // Type feedback
    fireEvent.change(subjectInput, { target: { value: "Feature Idea" } });
    fireEvent.change(messageInput, {
      target: { value: "Love the app! Please add crypto tracker." },
    });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/Thank you\. Your message has been received\./i)).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    vi.useRealTimers();
  });
});
