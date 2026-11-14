import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NavigationProgress } from "./NavigationProgress";

const mocks = vi.hoisted(() => ({ state: "idle" }));

vi.mock("react-router", () => ({ useNavigation: () => ({ state: mocks.state }) }));

describe("<NavigationProgress />", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("renders nothing when idle", () => {
    mocks.state = "idle";
    render(<NavigationProgress />);
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("shows nothing for a navigation that ends inside the delay", () => {
    mocks.state = "loading";
    const { rerender } = render(<NavigationProgress />);
    act(() => vi.advanceTimersByTime(150));
    expect(screen.queryByRole("progressbar")).toBeNull();
    mocks.state = "idle";
    rerender(<NavigationProgress />);
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it.each(["loading", "submitting"])("shows a labelled bar once %s outlasts the delay", (state) => {
    mocks.state = state;
    render(<NavigationProgress />);
    act(() => vi.advanceTimersByTime(200));
    expect(screen.getByRole("progressbar", { name: "Loading page" })).not.toBeNull();
  });

  it("keeps the bar for the minimum once shown", () => {
    mocks.state = "loading";
    const { rerender } = render(<NavigationProgress />);
    act(() => vi.advanceTimersByTime(250));
    mocks.state = "idle";
    rerender(<NavigationProgress />);
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByRole("progressbar")).not.toBeNull();
    act(() => vi.advanceTimersByTime(100));
    expect(screen.queryByRole("progressbar")).toBeNull();
  });
});
