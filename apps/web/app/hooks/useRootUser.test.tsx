import { renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { useRouteLoaderData } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { forgetRootUserOnAuthError, resetRememberedRootUser, useRootUser } from "./useRootUser";

vi.mock("react-router", () => ({
  useRouteLoaderData: vi.fn(),
  isRouteErrorResponse: (e: unknown) =>
    typeof e === "object" && e !== null && "status" in e && "statusText" in e,
}));

const loaderData = vi.mocked(useRouteLoaderData);
const signedIn = { id: "user-1", email: "reader@example.test" };

function Probe() {
  const user = useRootUser() as { id?: string } | null;
  return <span>{user?.id ?? "signed-out"}</span>;
}

describe("useRootUser", () => {
  beforeEach(() => {
    resetRememberedRootUser();
    loaderData.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads the user from the root loader by route id", () => {
    loaderData.mockReturnValue({ user: signedIn });
    const { result } = renderHook(() => useRootUser());
    expect(result.current).toEqual(signedIn);
    expect(loaderData).toHaveBeenCalledWith("root");
  });

  it("is null when the root loader gives no user", () => {
    loaderData.mockReturnValue({ user: undefined });
    expect(renderHook(() => useRootUser()).result.current).toBeNull();
  });

  it("keeps the last signed-in user when the root data is dropped on an error page", () => {
    loaderData.mockReturnValue({ user: signedIn });
    const { result, rerender } = renderHook(() => useRootUser());
    expect(result.current).toEqual(signedIn);

    loaderData.mockReturnValue(undefined);
    rerender();
    expect(result.current).toEqual(signedIn);
  });

  it("forgets the remembered user when the error is a lost or refused session", () => {
    loaderData.mockReturnValue({ user: signedIn });
    const { result, rerender } = renderHook(() => useRootUser());
    loaderData.mockReturnValue(undefined);
    forgetRootUserOnAuthError({ status: 401, statusText: "Unauthorized", data: null });
    rerender();
    expect(result.current).toBeNull();
  });

  it("keeps the remembered user for other errors", () => {
    loaderData.mockReturnValue({ user: signedIn });
    const { result, rerender } = renderHook(() => useRootUser());
    loaderData.mockReturnValue(undefined);
    forgetRootUserOnAuthError({ status: 500, statusText: "Server Error", data: null });
    rerender();
    expect(result.current).toEqual(signedIn);
  });

  it("forgets the user after sign-out reloads the root data with no user", () => {
    loaderData.mockReturnValue({ user: signedIn });
    const { result, rerender } = renderHook(() => useRootUser());

    loaderData.mockReturnValue({ user: null });
    rerender();
    expect(result.current).toBeNull();

    loaderData.mockReturnValue(undefined);
    rerender();
    expect(result.current).toBeNull();
  });

  it("is null with no root data and nothing remembered", () => {
    loaderData.mockReturnValue(undefined);
    expect(renderHook(() => useRootUser()).result.current).toBeNull();
  });

  it("on the server never falls back to a remembered user", () => {
    loaderData.mockReturnValue({ user: signedIn });
    renderHook(() => useRootUser());

    vi.stubGlobal("document", undefined);
    loaderData.mockReturnValue(undefined);
    expect(renderToString(<Probe />)).toContain("signed-out");
  });
});
