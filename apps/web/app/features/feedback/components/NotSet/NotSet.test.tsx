import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const inRouter = { current: false };
vi.mock("react-router", () => ({
  useInRouterContext: () => inRouter.current,
  Link: ({ children, to, ...rest }: any) => (
    <a data-router-link="true" href={to} {...rest}>
      {children}
    </a>
  ),
}));

import { NotSet } from "./NotSet";

describe("NotSet", () => {
  it("renders 'Not set' with a uniquely named link to where it can be set", () => {
    inRouter.current = false;
    render(<NotSet href="/app/profile" subject="salary" />);

    expect(screen.getByText("Not set").className).toMatch(/tabular-nums/);
    const link = screen.getByRole("link", { name: "Add salary" });
    expect(link.getAttribute("href")).toBe("/app/profile");
    expect(link.id).not.toBe("");
  });

  it("gives different subjects different accessible names and ids", () => {
    inRouter.current = false;
    render(
      <>
        <NotSet href="/app/profile" subject="salary" />
        <NotSet href="/app/tax" subject="income" />
      </>,
    );

    const salary = screen.getByRole("link", { name: "Add salary" });
    const income = screen.getByRole("link", { name: "Add income" });
    expect(salary.id).not.toBe(income.id);
  });

  it("accepts an explicit id", () => {
    inRouter.current = false;
    render(<NotSet href="/app/tax" id="tax-not-set" subject="income" />);
    expect(screen.getByRole("link", { name: "Add income" }).id).toBe("tax-not-set");
  });

  it("uses a plain anchor outside a router", () => {
    inRouter.current = false;
    render(<NotSet href="/app/profile" subject="salary" />);
    expect(screen.getByRole("link").getAttribute("data-router-link")).toBeNull();
  });

  it("uses the router Link inside a router for client-side navigation", () => {
    inRouter.current = true;
    render(<NotSet href="/app/profile" subject="salary" />);
    expect(screen.getByRole("link").getAttribute("data-router-link")).toBe("true");
  });

  it("supports a custom label", () => {
    inRouter.current = false;
    render(<NotSet href="/app/tax" label="Not calculated yet" subject="income" />);
    expect(screen.getByText("Not calculated yet")).toBeDefined();
  });
});
