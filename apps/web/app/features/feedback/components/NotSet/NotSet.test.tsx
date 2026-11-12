import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NotSet } from "./NotSet";

describe("NotSet", () => {
  it("renders 'Not set' with a link to where it can be set", () => {
    render(<NotSet href="/app/profile" actionLabel="Add salary" />);

    expect(screen.getByText("Not set").className).toMatch(/tabular-nums/);
    expect(screen.getByRole("link", { name: "Add salary" }).getAttribute("href")).toBe(
      "/app/profile",
    );
  });

  it("supports a custom label", () => {
    render(<NotSet href="/app/tax" label="Not calculated yet" />);

    expect(screen.getByText("Not calculated yet")).toBeDefined();
    expect(screen.getByRole("link", { name: "Add" })).toBeDefined();
  });
});
