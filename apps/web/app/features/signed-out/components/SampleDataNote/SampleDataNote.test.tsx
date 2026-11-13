import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SampleDataNote } from "./SampleDataNote";

describe("SampleDataNote", () => {
  it("shows the message and keeps the id", () => {
    const { container } = render(
      <SampleDataNote id="note">Sample data: illustrative figures.</SampleDataNote>,
    );
    expect(screen.getByText("Sample data: illustrative figures.")).toBeDefined();
    expect(container.querySelector("#note")).not.toBeNull();
  });
});
