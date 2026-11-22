import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  asksFirstTimeBuyerQuestion,
  estimateStampDuty,
  StampDutyEstimate,
  type StampDutyEstimateProps,
} from "./StampDutyEstimate";

const Stateful = (initial: Partial<StampDutyEstimateProps>) => {
  const [propertyPriceGbp, setPrice] = useState<number | null>(initial.propertyPriceGbp ?? null);
  const [jurisdiction, setJurisdiction] = useState(initial.jurisdiction ?? null);
  const [ftb, setFtb] = useState<boolean | null>(initial.allFirstTimeBuyersMainHome ?? null);
  return (
    <StampDutyEstimate
      allFirstTimeBuyersMainHome={ftb}
      defaultOpen={initial.defaultOpen ?? true}
      jurisdiction={jurisdiction}
      propertyPriceGbp={propertyPriceGbp}
      onAllFirstTimeBuyersMainHomeChange={setFtb}
      onJurisdictionChange={setJurisdiction}
      onPropertyPriceChange={setPrice}
    />
  );
};

const resultText = () => screen.getByTestId("stamp-duty-result").textContent ?? "";
const emptyText = () => screen.getByTestId("stamp-duty-empty").textContent ?? "";

describe("estimateStampDuty", () => {
  it("returns null until price, place and (where asked) the first-time buyer answer are given", () => {
    expect(
      estimateStampDuty({
        propertyPriceGbp: null,
        jurisdiction: "ENGLAND_NI",
        allFirstTimeBuyersMainHome: false,
      }),
    ).toBeNull();
    expect(
      estimateStampDuty({
        propertyPriceGbp: 0,
        jurisdiction: "ENGLAND_NI",
        allFirstTimeBuyersMainHome: false,
      }),
    ).toBeNull();
    expect(
      estimateStampDuty({
        propertyPriceGbp: 250_000,
        jurisdiction: null,
        allFirstTimeBuyersMainHome: false,
      }),
    ).toBeNull();
    expect(
      estimateStampDuty({
        propertyPriceGbp: 250_000,
        jurisdiction: "SCOTLAND",
        allFirstTimeBuyersMainHome: null,
      }),
    ).toBeNull();
  });

  it("does not need the first-time buyer answer in Wales, which has no relief", () => {
    // LTT £300,000: 0% on the first £225,000; 6% x (300,000 - 225,000) = 6% x 75,000 = £4,500.
    const res = estimateStampDuty({
      propertyPriceGbp: 300_000,
      jurisdiction: "WALES",
      allFirstTimeBuyersMainHome: null,
    });
    expect(res?.taxGbp).toBe(4500);
    expect(asksFirstTimeBuyerQuestion("WALES")).toBe(false);
    expect(asksFirstTimeBuyerQuestion("ENGLAND_NI")).toBe(true);
    expect(asksFirstTimeBuyerQuestion("SCOTLAND")).toBe(true);
    expect(asksFirstTimeBuyerQuestion(null)).toBe(false);
  });

  it("passes the first-time buyer answer through: yes gives relief, no does not", () => {
    // SDLT £400,000, first-time buyer: 0% to £300,000; 5% x 100,000 = £5,000.
    // SDLT £400,000, standard: 2% x 125,000 = £2,500; 5% x 150,000 = £7,500; total £10,000.
    expect(
      estimateStampDuty({
        propertyPriceGbp: 400_000,
        jurisdiction: "ENGLAND_NI",
        allFirstTimeBuyersMainHome: true,
      })?.taxGbp,
    ).toBe(5000);
    expect(
      estimateStampDuty({
        propertyPriceGbp: 400_000,
        jurisdiction: "ENGLAND_NI",
        allFirstTimeBuyersMainHome: false,
      })?.taxGbp,
    ).toBe(10000);
  });
});

describe("StampDutyEstimate", () => {
  it("starts closed and opens with its disclosure button", () => {
    render(<Stateful defaultOpen={false} />);
    const button = screen.getByRole("button", { name: "Stamp duty estimate" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Where is the property?")).toBeNull();
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Where is the property?").tagName).toBe("LEGEND");
  });

  it("has no place chosen at first, even with a price typed", () => {
    render(<Stateful propertyPriceGbp={250_000} />);
    for (const name of ["England or Northern Ireland", "Scotland", "Wales"]) {
      expect((screen.getByRole("radio", { name }) as HTMLInputElement).checked).toBe(false);
    }
    expect(emptyText()).toBe("Choose where the property is to see an estimate.");
  });

  it("shows the SDLT line in whole pounds with the dates from the result", () => {
    // SDLT £250,000, not first-time: 0% to £125,000; 2% x 125,000 = £2,500.
    render(<Stateful allFirstTimeBuyersMainHome={false} propertyPriceGbp={250_000} />);
    fireEvent.click(screen.getByRole("radio", { name: "England or Northern Ireland" }));
    expect(resultText()).toContain("Estimated stamp duty: ~£2,500");
    expect(resultText()).toContain("Rates in effect from 1 April 2025.");
    expect(resultText()).toContain("Sources checked on 22 November 2026.");
  });

  it("shows the SDLT total floored to whole pounds by the engine", () => {
    // SDLT £250,075: 2% x 125,000 = £2,500; 5% x 75 = £3.75; total £2,503.75, floored to £2,503.
    render(
      <Stateful
        allFirstTimeBuyersMainHome={false}
        jurisdiction="ENGLAND_NI"
        propertyPriceGbp={250_075}
      />,
    );
    expect(resultText()).toContain("~£2,503");
    expect(resultText()).not.toContain("2,503.75");
  });

  it("keeps pence for LBTT and uses the tax's own name", () => {
    // LBTT £145,050.50, standard: 2% x (145,050.50 - 145,000) = 2% x 50.50 = £1.01.
    render(
      <Stateful
        allFirstTimeBuyersMainHome={false}
        jurisdiction="SCOTLAND"
        propertyPriceGbp={145_050.5}
      />,
    );
    expect(resultText()).toContain("Estimated Land and Buildings Transaction Tax: ~£1.01");
    expect(resultText()).toContain("Rates in effect from 1 April 2021.");
  });

  it("asks the first-time buyer question in Scotland and applies relief on yes", () => {
    // LBTT £200,000, first-time buyer: 0% to £175,000; 2% x 25,000 = £500.
    // LBTT £200,000, standard: 2% x (200,000 - 145,000) = 2% x 55,000 = £1,100.
    render(<Stateful jurisdiction="SCOTLAND" propertyPriceGbp={200_000} />);
    expect(emptyText()).toBe("Answer the first-time buyer question to see an estimate.");
    expect(
      screen.getByText("Are all the buyers first-time buyers, buying this as their main home?")
        .tagName,
    ).toBe("LEGEND");
    fireEvent.click(screen.getByRole("radio", { name: "Yes" }));
    expect(resultText()).toContain("~£500");
    fireEvent.click(screen.getByRole("radio", { name: "No" }));
    expect(resultText()).toContain("~£1,100");
  });

  it("does not ask the first-time buyer question in Wales and uses LTT", () => {
    // LTT £300,000: 6% x 75,000 = £4,500.
    render(<Stateful jurisdiction="WALES" propertyPriceGbp={300_000} />);
    expect(screen.queryByRole("radio", { name: "Yes" })).toBeNull();
    expect(resultText()).toContain("Estimated Land Transaction Tax: ~£4,500");
    expect(resultText()).toContain("Rates in effect from 10 October 2022.");
  });

  it("asks for a price when none is typed and says what is not modelled", () => {
    render(<Stateful jurisdiction="ENGLAND_NI" />);
    expect(emptyText()).toBe("Enter a property price to see an estimate.");
    expect(screen.getByTestId("stamp-duty-estimate").textContent).toContain(
      "This is for a main home where no buyer owns another home. Higher rates for additional homes and for buyers who are not UK residents are not included.",
    );
  });

  it("reports choices to its handlers", () => {
    const onJurisdictionChange = vi.fn();
    const onAllFirstTimeBuyersMainHomeChange = vi.fn();
    render(
      <StampDutyEstimate
        allFirstTimeBuyersMainHome={null}
        defaultOpen
        jurisdiction="ENGLAND_NI"
        propertyPriceGbp={250_000}
        onAllFirstTimeBuyersMainHomeChange={onAllFirstTimeBuyersMainHomeChange}
        onJurisdictionChange={onJurisdictionChange}
        onPropertyPriceChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Wales" }));
    expect(onJurisdictionChange).toHaveBeenCalledWith("WALES");
    fireEvent.click(screen.getByRole("radio", { name: "No" }));
    expect(onAllFirstTimeBuyersMainHomeChange).toHaveBeenCalledWith(false);
  });
});
