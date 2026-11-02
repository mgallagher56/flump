import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { ResponsiveProvider, useResponsive } from "./ResponsiveContext";

describe("ResponsiveContext", () => {
  test("provides default values without provider", () => {
    const { result } = renderHook(() => useResponsive());
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isMobileDrawerOpen).toBe(false);
  });

  test("respects initialIsMobile and toggles mobile drawer state", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ResponsiveProvider initialIsMobile={true}>{children}</ResponsiveProvider>
    );
    const { result } = renderHook(() => useResponsive(), { wrapper });
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isMobileDrawerOpen).toBe(false);

    act(() => {
      result.current.toggleMobileDrawer();
    });
    expect(result.current.isMobileDrawerOpen).toBe(true);

    act(() => {
      result.current.setMobileDrawerOpen(false);
    });
    expect(result.current.isMobileDrawerOpen).toBe(false);
  });
});
