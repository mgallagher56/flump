import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NavigationProgress } from "./NavigationProgress";

const mocks = vi.hoisted(() => ({ state: "idle" }));

vi.mock("react-router", () => ({ useNavigation: () => ({ state: mocks.state }) }));

describe("<NavigationProgress />", () => {
  it("renders nothing when idle", () => {
    mocks.state = "idle";
    render(<NavigationProgress />);
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it.each(["loading", "submitting"])("shows a labelled progress bar while %s", (state) => {
    mocks.state = state;
    render(<NavigationProgress />);
    expect(screen.getByRole("progressbar", { name: "Loading page" })).not.toBeNull();
  });
});
