import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AreaStrip } from "./AreaStrip";

const renderStrip = (current?: Parameters<typeof AreaStrip>[0]["current"]) =>
  render(
    <MemoryRouter>
      <AreaStrip current={current} />
    </MemoryRouter>,
  );

describe("AreaStrip", () => {
  it("links the five areas in the app's order", () => {
    renderStrip();
    const links = within(screen.getByTestId("area-strip")).getAllByRole("link");
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Accounts", "/features/accounts"],
      ["Budget", "/features/budget"],
      ["Pay", "/features/pay"],
      ["Savings and pension", "/features/savings-and-pension"],
      ["Debt and borrowing", "/features/debt-and-borrowing"],
    ]);
    expect(screen.queryByText("You are here")).toBeNull();
  });

  it("marks the current area in words and with aria-current, and no other", () => {
    renderStrip("pay");
    const current = screen.getByRole("link", { current: "page" });
    expect(current.getAttribute("href")).toBe("/features/pay");
    expect(current.textContent).toBe("PayYou are here");
    expect(screen.getAllByText("You are here")).toHaveLength(1);
  });
});
