import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, test, vi } from "vitest";
import { NetWorthBasisLine, type NetWorthBasisLineProps } from "./NetWorthBasisLine";

// The shared setup renders Link as bare text; these tests check the real link targets.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const setup = (props: NetWorthBasisLineProps) =>
  render(
    <MemoryRouter>
      <NetWorthBasisLine {...props} />
    </MemoryRouter>,
  );

describe("<NetWorthBasisLine />", () => {
  test("renders nothing when nothing is left out", () => {
    const { container } = setup({ leftOut: [] });
    expect(container.textContent).toBe("");
  });

  test("names one left-out item and links to the choices", () => {
    setup({ leftOut: ["studentLoan"] });
    expect(screen.getByTestId("net-worth-basis-line").textContent).toBe(
      "Not counting your student loan. Change what counts",
    );
    expect(screen.getByRole("link", { name: "Change what counts" }).getAttribute("href")).toBe(
      "/app/profile?tab=profile#net-worth",
    );
  });

  test("joins items in the fixed order with commas and or", () => {
    setup({ leftOut: ["property", "mortgage", "studentLoan"] });
    expect(screen.getByTestId("net-worth-basis-line").textContent).toContain(
      "Not counting your property, mortgage or student loan.",
    );
  });

  test("the missing home value ask replaces the line, one notice only", () => {
    setup({ leftOut: ["studentLoan", "homeValueMissing"] });
    const line = screen.getByTestId("net-worth-basis-line");
    expect(line.textContent).toBe(
      "Your home's value is not counted until you add an estimate. Add an estimate",
    );
    expect(screen.getByRole("link", { name: "Add an estimate" }).getAttribute("href")).toBe(
      "/app/accounts",
    );
    expect(screen.queryByRole("link", { name: "Change what counts" })).toBeNull();
  });

  test("alwaysShowLink keeps the link when nothing is left out, with no sentence", () => {
    setup({ leftOut: [], alwaysShowLink: true, id: "accounts-basis" });
    expect(screen.getByTestId("accounts-basis").textContent).toBe("Change what counts");
  });

  test("never shows a figure", () => {
    setup({ leftOut: ["property", "mortgage"] });
    expect(screen.getByTestId("net-worth-basis-line").textContent).not.toMatch(/\d|£/);
  });
});
