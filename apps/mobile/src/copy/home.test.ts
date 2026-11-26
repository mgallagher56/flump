import { changeLine, leftOutSentence, sinceLabel, spokenPounds } from "./home";

describe("Home words", () => {
  it("names the month since, with the year only when it is not this year's", () => {
    expect(sinceLabel("2026-10", "2026-11")).toBe("October");
    expect(sinceLabel("2025-12", "2026-01")).toBe("December 2025");
  });

  it("a change has no sign: the arrow and the spoken word carry the direction", () => {
    expect(changeLine({ priorMonth: "2026-10", change: 320 }, "2026-11")).toEqual({
      direction: "up",
      text: "£320 since October",
      spoken: "up £320 since October",
    });
    expect(changeLine({ priorMonth: "2025-12", change: -1250 }, "2026-01")).toEqual({
      direction: "down",
      text: "£1,250 since December 2025",
      spoken: "down £1,250 since December 2025",
    });
    expect(changeLine({ priorMonth: "2026-10", change: 0 }, "2026-11")).toEqual({
      direction: "flat",
      text: "Same as October",
      spoken: "same as October",
    });
  });

  it("speaks a minus as minus", () => {
    expect(spokenPounds(-6400)).toBe("minus £6,400");
    expect(spokenPounds(52100)).toBe("£52,100");
  });

  it("leaves nothing to say when nothing is left out", () => {
    expect(leftOutSentence([])).toBe("");
    expect(leftOutSentence(["studentLoan"])).toBe("Not counting your student loan.");
  });
});
