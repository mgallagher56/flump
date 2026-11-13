import { ToastProvider } from "@repo/ui";
import { act, render, renderHook, screen } from "@testing-library/react";
import type { FC } from "react";
import { describe, expect, it } from "vitest";
import { type OnboardingNotify, useOnboardingNotify } from "./notify";

const Probe: FC<{ onNotify: (notify: OnboardingNotify) => void }> = ({ onNotify }) => {
  onNotify(useOnboardingNotify());
  return null;
};

describe("useOnboardingNotify", () => {
  it("is a stable no-op without a toast provider", () => {
    const { result, rerender } = renderHook(() => useOnboardingNotify());
    const first = result.current;
    expect(() => first("Your details are saved")).not.toThrow();
    rerender();
    expect(result.current).toBe(first);
  });

  it("raises a toast inside a ToastProvider", () => {
    let notify: (message: string) => void = () => {};
    render(
      <ToastProvider>
        <Probe
          onNotify={(fn) => {
            notify = fn;
          }}
        />
      </ToastProvider>,
    );
    act(() => notify("Your details are saved"));
    expect(screen.getAllByText("Your details are saved").length).toBeGreaterThan(0);
  });
});
