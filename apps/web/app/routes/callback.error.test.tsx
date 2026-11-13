import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const loaderData = vi.hoisted(() => ({ value: null as unknown }));

vi.mock("react-router", async () => ({
  ...(await vi.importActual<object>("react-router")),
  useLoaderData: () => loaderData.value,
}));
vi.mock("@workos-inc/authkit-react-router", () => ({
  authLoader: () => vi.fn(),
  configure: vi.fn(),
}));

import CallbackRoute from "./callback";

describe("callback error rendering", () => {
  it("shows safe generic copy, never the provider message, with a sign-in action", () => {
    loaderData.value = { error: { message: "invalid_grant: code abc123", description: "secret" } };
    const { container } = render(<CallbackRoute />);
    expect(
      screen.getByRole("heading", { level: 1, name: "We couldn't sign you in" }),
    ).toBeDefined();
    expect(screen.getByRole("link", { name: "Try signing in again" }).getAttribute("href")).toBe(
      "/login",
    );
    expect(container.textContent).not.toContain("invalid_grant");
    expect(container.textContent).not.toContain("secret");
    expect(container.textContent).not.toContain("!");
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders nothing without an error", () => {
    loaderData.value = null;
    const { container } = render(<CallbackRoute />);
    expect(container.textContent).toBe("");
  });
});
