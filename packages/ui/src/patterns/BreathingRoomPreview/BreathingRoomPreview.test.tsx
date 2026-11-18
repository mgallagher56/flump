import { buildFinancialPicture, SAMPLE_HOUSEHOLDS } from "@flump/finance-engine";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BreathingRoomPreview } from "./BreathingRoomPreview";
import {
  BREATHING_ROOM_DESCRIPTION,
  breathingRoomPhrase,
  breathingRoomValue,
} from "./BreathingRoomPreview.wording";

const gbp = (value: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);

const coverOf = (household: "renter" | "homeowner") => {
  const cover = buildFinancialPicture(SAMPLE_HOUSEHOLDS[household].fixture).monthsOfCover;
  if (cover.status !== "known") throw new Error("sample household cover must be known");
  return cover.value;
};

describe("breathing room wording", () => {
  it("always says About, one decimal and the right plural", () => {
    expect(breathingRoomValue(1.5)).toBe("About 1.5 months");
    expect(breathingRoomValue(1)).toBe("About 1 month");
    expect(breathingRoomValue(6.4)).toBe("About 6.4 months");
    expect(breathingRoomValue(0)).toBe("About 0 months");
    expect(breathingRoomValue(130)).toBe("More than 10 years");
    expect(breathingRoomPhrase(4.7)).toBe("about 4.7 months");
  });
});

describe("BreathingRoomPreview", () => {
  it.each(["renter", "homeowner"] as const)(
    "shows the %s household's saved breathing room from the engine",
    (household) => {
      const cover = coverOf(household);
      render(<BreathingRoomPreview household={household} id="test-br" />);

      expect(screen.getByRole("heading", { name: "Model a change" })).toBeDefined();
      expect(screen.getByText("Breathing room")).toBeDefined();
      expect(screen.getByText(breathingRoomValue(cover.months))).toBeDefined();
      expect(screen.getByText(BREATHING_ROOM_DESCRIPTION)).toBeDefined();
      expect(screen.getByTestId("test-br-essentials").textContent).toBe(
        `${gbp(cover.monthlyEssentials)} a month`,
      );
      expect(screen.getByTestId("test-br-savings").textContent).toBe(gbp(cover.liquidCash));
      expect(screen.queryByTestId("test-br-delta")).toBeNull();
    },
  );

  it("models a change to savings and resets to the saved figures", () => {
    const cover = coverOf("renter");
    render(<BreathingRoomPreview household="renter" id="test-br" />);

    fireEvent.change(screen.getByLabelText("Change in emergency savings"), {
      target: { value: "1000" },
    });

    expect(screen.getByTestId("test-br-savings").textContent).toBe(gbp(cover.liquidCash + 1000));
    expect(screen.getByTestId("test-br-delta").textContent).toMatch(
      /^\+\d+(\.\d)? months? compared to saved figures$/,
    );

    fireEvent.click(screen.getByRole("button", { name: "Reset to saved figures" }));
    expect(screen.getByText(breathingRoomValue(cover.months))).toBeDefined();
    expect(screen.queryByTestId("test-br-delta")).toBeNull();
  });
});
