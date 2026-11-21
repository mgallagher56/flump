import { renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { useHydrated } from "./useHydrated";

function Probe() {
  return <span>{useHydrated() ? "hydrated" : "server"}</span>;
}

function Exact() {
  return <span>{String(useHydrated())}</span>;
}

describe("useHydrated", () => {
  it("is false in the server HTML", () => {
    expect(renderToString(<Probe />)).toContain("server");
  });

  it("is exactly false, not just falsy, in the server HTML", () => {
    expect(renderToString(<Exact />)).toContain("false");
  });

  it("is true once rendered in the browser", () => {
    expect(renderHook(() => useHydrated()).result.current).toBe(true);
  });
});
