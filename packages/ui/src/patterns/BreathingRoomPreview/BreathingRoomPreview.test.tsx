import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BreathingRoomPreview } from "./BreathingRoomPreview";
import {
  BREATHING_ROOM_DESCRIPTION,
  breathingRoomPhrase,
  breathingRoomValue,
  formatBreathingRoomMonths,
} from "./BreathingRoomPreview.wording";

// Worked by hand from the persona fixtures (packages/finance-engine/src/picture/__fixtures__/personas):
// renter (sam.ts): liquid cash 1,850 current + 4,200 cash ISA = 6,050; essentials 850 rent
//   + 120 bills + 220 groceries + 90 travel = 1,280 a month; 6,050 / 1,280 = 4.73, so 4.7 months.
// homeowner (homeowner.ts): liquid cash 21,000; essentials 1,050 mortgage + 330 council tax and
//   energy + 400 groceries = 1,780, plus the larger of the card and loan minimums (60 + 220 = 280)
//   and the 280 debt budget row, so the 280 counts once: 2,060 a month; 21,000 / 2,060 = 10.19,
//   so 10.2 months.
const EXPECTED = {
  renter: { value: "About 4.7 months", essentials: "£1,280 a month", savings: "£6,050" },
  homeowner: { value: "About 10.2 months", essentials: "£2,060 a month", savings: "£21,000" },
} as const;

describe("breathing room wording", () => {
  it("always says About, one decimal and the right plural", () => {
    expect(breathingRoomValue(1.5)).toBe("About 1.5 months");
    expect(breathingRoomValue(1)).toBe("About 1 month");
    expect(breathingRoomValue(6.4)).toBe("About 6.4 months");
    expect(breathingRoomValue(0)).toBe("About 0 months");
    expect(breathingRoomValue(130)).toBe("More than 10 years");
    expect(breathingRoomPhrase(4.7)).toBe("about 4.7 months");
  });

  it("words a bare figure without About", () => {
    // 13 months is one year and one month.
    expect(formatBreathingRoomMonths(13)).toBe("1 year 1 month");
    expect(formatBreathingRoomMonths(1)).toBe("1 month");
  });

  it("words a figure that rounds to 1 as one month", () => {
    expect(breathingRoomValue(1.04)).toBe("About 1 month");
    expect(breathingRoomValue(0.96)).toBe("About 1 month");
    expect(breathingRoomValue(1.06)).toBe("About 1.1 months");
  });
});

describe("BreathingRoomPreview", () => {
  it.each(["renter", "homeowner"] as const)(
    "shows the %s household's saved breathing room from the engine",
    (household) => {
      const expected = EXPECTED[household];
      render(<BreathingRoomPreview household={household} id="test-br" />);

      expect(screen.getByRole("heading", { name: "Model a change" })).toBeDefined();
      expect(screen.getByText("Breathing room")).toBeDefined();
      expect(screen.getByText(expected.value)).toBeDefined();
      expect(screen.getByText(BREATHING_ROOM_DESCRIPTION)).toBeDefined();
      expect(screen.getByTestId("test-br-essentials").textContent).toBe(expected.essentials);
      expect(screen.getByTestId("test-br-savings").textContent).toBe(expected.savings);
      expect(screen.queryByTestId("test-br-delta")).toBeNull();
    },
  );

  it("models a change to savings and resets to the saved figures", () => {
    render(<BreathingRoomPreview household="renter" id="test-br" />);

    fireEvent.change(screen.getByLabelText("Change in emergency savings"), {
      target: { value: "1000" },
    });

    // 6,050 + 1,000 = 7,050; 7,050 / 1,280 = 5.51, so 5.5 months: 0.8 more than the saved 4.7.
    expect(screen.getByTestId("test-br-savings").textContent).toBe("£7,050");
    expect(screen.getByTestId("test-br-delta").textContent).toBe(
      "+0.8 months compared to saved figures",
    );

    fireEvent.click(screen.getByRole("button", { name: "Reset to saved figures" }));
    expect(screen.getByText(EXPECTED.renter.value)).toBeDefined();
    expect(screen.queryByTestId("test-br-delta")).toBeNull();
  });
});

describe("BreathingRoomPreview modelling", () => {
  const spending = () => screen.getByLabelText("Change in monthly essential spending");
  const savings = () => screen.getByLabelText("Change in emergency savings");
  const delta = () => screen.getByTestId("test-br-delta").textContent;

  it("models a change to spending alone, and resets it", () => {
    render(<BreathingRoomPreview household="renter" id="test-br" />);
    fireEvent.change(spending(), { target: { value: "100" } });
    // Essentials 1,280 + 100 = 1,380; 6,050 / 1,380 = 4.38, so 4.4 months (the engine rounds to
    // one decimal); the saved 6,050 / 1,280 = 4.73 is 4.7, so 0.3 fewer.
    expect(screen.getByTestId("test-br-essentials").textContent).toBe("£1,380 a month");
    expect(delta()).toMatch(/^[-−]0\.3 months compared to saved figures$/);
    fireEvent.click(screen.getByRole("button", { name: "Reset to saved figures" }));
    expect(screen.getByTestId("test-br-essentials").textContent).toBe("£1,280 a month");
  });

  it("can lower spending by up to £500", () => {
    render(<BreathingRoomPreview household="renter" id="test-br" />);
    fireEvent.change(spending(), { target: { value: "-500" } });
    // The engine rounds months to one decimal before the difference: saved 6,050 / 1,280 = 4.73,
    // so 4.7. 1,280 - 500 = 780 a month; 6,050 / 780 = 7.76, so 7.8; 7.8 - 4.7 = 3.1 more.
    expect(delta()).toBe("+3.1 months compared to saved figures");
  });

  it("says one month, not months, for a change of exactly one", () => {
    render(<BreathingRoomPreview household="renter" id="test-br" />);
    fireEvent.change(savings(), { target: { value: "1300" } });
    // 6,050 + 1,300 = 7,350; 7,350 / 1,280 = 5.74, so 5.7; 5.7 - 4.7 = 1.0 more.
    expect(delta()).toBe("+1 month compared to saved figures");
  });

  it("says there is no change when the change rounds to none", () => {
    render(<BreathingRoomPreview household="renter" id="test-br" />);
    fireEvent.change(savings(), { target: { value: "-50" } });
    // 6,050 - 50 = 6,000; 6,000 / 1,280 = 4.69, so 4.7, the same as the saved 4.7.
    expect(delta()).toBe("No change compared to saved figures");
  });
});
