import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { JourneyStop } from "./JourneyStop";
import { JOURNEY_STOPS } from "./journeyStops";

const renderStop = (index: number) =>
  render(
    <MemoryRouter>
      <ol>
        <JourneyStop index={index} stop={JOURNEY_STOPS[index] as (typeof JOURNEY_STOPS)[number]} />
      </ol>
    </MemoryRouter>,
  );

describe("JourneyStop", () => {
  it("shows the stop's name, title, lead, fact and link, labelled by its title", () => {
    renderStop(1);
    const article = screen.getByRole("article", { name: "Budget and breathing room" });
    expect(article.id).toBe("journey-stop-budget");
    expect(screen.getByText("Budget")).toBeTruthy();
    expect(
      screen.getByText("What comes in, what goes out and what is left over each month."),
    ).toBeTruthy();
    expect(
      screen.getByText("Flump shows what is left over each month, or how much you are short."),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "About budget in Flump" }).getAttribute("href")).toBe(
      "/features/budget",
    );
  });

  it("marks its place for the orb's track with a decorative dot in the name", () => {
    const { container } = renderStop(0);
    const marker = container.querySelector("[data-stop-marker]");
    expect(marker?.getAttribute("aria-hidden")).toBe("true");
    expect(marker?.className).not.toMatch(/violet|rose|series[45]|accentPurple/);
  });

  it("ends the journey at the preview, with no invite button", () => {
    renderStop(5);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText("Request an invite")).toBeNull();
    expect(
      screen.getByRole("link", { name: "Open the interactive preview" }).getAttribute("href"),
    ).toBe("/preview");
  });

  it("covers the six stops in reading order, five areas then the picture", () => {
    expect(JOURNEY_STOPS.map((s) => s.key)).toEqual([
      "accounts",
      "budget",
      "pay",
      "savings-and-pension",
      "debt-and-borrowing",
      "picture",
    ]);
    expect(JOURNEY_STOPS.find((s) => s.key === "debt-and-borrowing")?.orbTone).toBe("violet");
  });
});
