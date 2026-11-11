import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@workos-inc/authkit-react-router", () => ({
  authLoader: vi.fn(() => vi.fn()),
  configure: vi.fn(),
}));

const mocks = vi.hoisted(() => ({ useLoaderData: vi.fn() }));
vi.mock("react-router", async () => ({
  ...(await vi.importActual<Record<string, unknown>>("react-router")),
  useLoaderData: mocks.useLoaderData,
}));

import AuthCallbackRoute from "./auth.callback";

describe("AuthCallbackRoute", () => {
  it("renders the failure state under a level-1 heading", () => {
    mocks.useLoaderData.mockReturnValue({ error: { message: "boom" } });
    render(<AuthCallbackRoute />);
    expect(screen.getByRole("heading", { level: 1 })).toBeDefined();
  });
});
