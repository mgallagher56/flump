import { afterEach, describe, expect, it } from "vitest";
import { visuallyHiddenRecipe } from "../primitives/VisuallyHidden/VisuallyHidden.styles";
import { countFigures, countNotSet, expectPageRules, findFigures } from "./pageRules";

const roots: HTMLElement[] = [];
const dom = (html: string): HTMLElement => {
  const root = document.createElement("div");
  root.innerHTML = html;
  document.body.appendChild(root);
  roots.push(root);
  return root;
};

afterEach(() => {
  for (const root of roots.splice(0)) root.remove();
});

describe("countFigures", () => {
  it("counts money in its en-GB forms", () => {
    const root = dom(
      "<p>£1,234</p><p>-£1,234.56</p><p>−£3.4k</p><p>£1.2m and £1.5bn</p><p>£0</p><p>£ 50</p>",
    );
    expect(findFigures(root).map((f) => [f.kind, f.text])).toEqual([
      ["money", "£1,234"],
      ["money", "-£1,234.56"],
      ["money", "−£3.4k"],
      ["money", "£1.2m"],
      ["money", "£1.5bn"],
      ["money", "£0"],
      ["money", "£ 50"],
    ]);
  });

  it("does not take a trailing comma or full stop into a money amount", () => {
    const root = dom("<p>You pay £1,000, then £250.</p>");
    expect(findFigures(root).map((f) => f.text)).toEqual(["£1,000", "£250"]);
  });

  it("counts percentages, with or without a space or decimals", () => {
    const root = dom("<p>5% growth, 24.9% APR, 5.25 % fixed, -1.5% change</p>");
    expect(findFigures(root).map((f) => [f.kind, f.text])).toEqual([
      ["percent", "5%"],
      ["percent", "24.9%"],
      ["percent", "5.25 %"],
      ["percent", "-1.5%"],
    ]);
  });

  it("counts a years-and-months duration once", () => {
    const root = dom("<p>Paid off in 3 years 4 months</p><p>1 year and 2 months</p>");
    expect(findFigures(root)).toEqual([
      { kind: "duration", text: "3 years 4 months" },
      { kind: "duration", text: "1 year and 2 months" },
    ]);
  });

  it("counts single-unit durations", () => {
    const root = dom("<p>30 years, 18 months, 6 weeks, 10 days, 1 year</p>");
    expect(findFigures(root).map((f) => f.text)).toEqual([
      "30 years",
      "18 months",
      "6 weeks",
      "10 days",
      "1 year",
    ]);
  });

  it("counts dates as month and year, with an optional day, and tax years", () => {
    const root = dom(
      "<p>Mar 2030</p><p>March 2030</p><p>1 Mar 2030</p><p>Sept 2027</p><p>Tax year 2025/26</p>",
    );
    expect(findFigures(root)).toEqual([
      { kind: "date", text: "Mar 2030" },
      { kind: "date", text: "March 2030" },
      { kind: "date", text: "1 Mar 2030" },
      { kind: "date", text: "Sept 2027" },
      { kind: "date", text: "2025/26" },
    ]);
  });

  it("ignores bare numbers, bare years, counts and words that look like months", () => {
    const root = dom(
      "<p>3 accounts</p><p>In 2030</p><p>Year 5</p><p>You may want to check</p><p>12 rows</p>",
    );
    expect(countFigures(root)).toBe(0);
  });

  it("counts each occurrence, so a repeated figure costs twice", () => {
    expect(countFigures(dom("<p>£500</p><p>£500</p>"))).toBe(2);
  });

  it("counts several figures in one sentence", () => {
    expect(countFigures(dom("<p>£320 a month at 4.5% until Mar 2030</p>"))).toBe(3);
  });

  it("never joins text from adjacent inline elements into one figure", () => {
    // Two figures side by side in inline elements stay two, and neither absorbs the other.
    const side = dom("<p><span>£1,250</span><span>5%</span></p>");
    expect(findFigures(side)).toEqual([
      { kind: "money", text: "£1,250" },
      { kind: "percent", text: "5%" },
    ]);
    // "Mar" and "2030" in different elements are not a date; "£" and "1,250" are not money.
    const split = dom("<p><span>Mar</span> 2030, <span>£</span><strong>1,250</strong></p>");
    expect(countFigures(split)).toBe(0);
    // Digits in one element and "%" in the next are not a percentage.
    expect(countFigures(dom("<p><b>12</b><i>%</i></p>"))).toBe(0);
  });

  it("joins adjacent text nodes of one element (React splits {n} months into two)", () => {
    const root = dom("<p></p>");
    const p = root.querySelector("p") as HTMLParagraphElement;
    p.append(document.createTextNode("18"), document.createTextNode(" months"));
    expect(findFigures(root)).toEqual([{ kind: "duration", text: "18 months" }]);
  });

  it("counts a figure inside an inline element of a sentence", () => {
    const root = dom("<p>You pay <strong>£1,250</strong> a month</p>");
    expect(findFigures(root)).toEqual([{ kind: "money", text: "£1,250" }]);
  });

  it("counts en-GB numeric dates, with a four or two digit year", () => {
    const root = dom("<p>Due 14/11/2026</p><p>Paid 1/3/26</p><p>Tax year 2025/26</p>");
    expect(findFigures(root).map((f) => [f.kind, f.text])).toEqual([
      ["date", "14/11/2026"],
      ["date", "1/3/26"],
      ["date", "2025/26"],
    ]);
  });

  it("does not join text across block elements", () => {
    // "Mar" and "2030" in separate cells are not a date; "£" alone is not money.
    const root = dom("<table><tr><td>Mar</td><td>2030</td><td>£</td><td>5</td></tr></table>");
    expect(countFigures(root)).toBe(0);
  });

  it("treats non-breaking spaces as spaces", () => {
    expect(findFigures(dom("<p>3&nbsp;years&nbsp;4&nbsp;months</p>"))).toEqual([
      { kind: "duration", text: "3 years 4 months" },
    ]);
  });

  it("counts a data-figure element once, whatever its text", () => {
    const root = dom(
      "<p data-figure><span>£</span><span>1,000</span> and 5%</p><p data-figure>Three quarters</p>",
    );
    expect(findFigures(root)).toEqual([
      { kind: "marked", text: "£1,000 and 5%" },
      { kind: "marked", text: "Three quarters" },
    ]);
  });

  it("counts nested data-figure elements once, as the outer one", () => {
    expect(countFigures(dom("<div data-figure>£5 <span data-figure>£6</span></div>"))).toBe(1);
  });

  it("counts the root itself once when it is a data-figure", () => {
    const root = dom("£1 and £2");
    root.setAttribute("data-figure", "");
    expect(countFigures(root)).toBe(1);
  });

  it("excludes list rows (P1.4)", () => {
    const root = dom(
      "<p>Total £10,000</p><ul><li data-list-row>Saver £4,000 at 4.1%</li><li data-list-row>ISA £6,000</li></ul>",
    );
    expect(findFigures(root)).toEqual([{ kind: "money", text: "£10,000" }]);
  });

  it("ignores aria-hidden, hidden, template, script, style and svg content", () => {
    const root = dom(
      [
        '<div aria-hidden="true">£1</div>',
        "<div hidden>£2</div>",
        "<template><p>£3</p></template>",
        "<script>const a = '£4';</script>",
        "<style>.a::after{content:'5%'}</style>",
        '<svg><text x="0" y="0">£6</text></svg>',
        "<p>£7</p>",
      ].join(""),
    );
    expect(findFigures(root)).toEqual([{ kind: "money", text: "£7" }]);
  });

  it("ignores visually hidden text and data-figure-ignore", () => {
    const hidden = visuallyHiddenRecipe({ focusable: false });
    const root = dom(
      `<span class="${hidden}">£1,000</span><span data-figure-ignore>5%</span><span class="${hidden} extra">£9</span><p>£2</p>`,
    );
    expect(findFigures(root).map((f) => f.text)).toEqual(["£2"]);
  });

  it("does not treat an element with only some visually hidden classes as hidden", () => {
    const first = visuallyHiddenRecipe({ focusable: false }).split(" ")[0] ?? "";
    expect(countFigures(dom(`<span class="${first}">£3</span>`))).toBe(1);
  });

  it("returns 0 for an empty or skipped root", () => {
    expect(countFigures(dom(""))).toBe(0);
    const root = dom("<p>£5</p>");
    root.setAttribute("aria-hidden", "true");
    expect(countFigures(root)).toBe(0);
  });
});

describe("countNotSet", () => {
  it("counts shown Not set values, in separate or shared blocks, and skips hidden ones", () => {
    const root = dom(
      '<p>Not set</p><p>Rate: Not set. Term: Not set</p><span aria-hidden="true">Not set</span>',
    );
    expect(countNotSet(root)).toBe(3);
  });
});

describe("expectPageRules", () => {
  const page = (body: string) => dom(`<h1>Your money</h1>${body}`);

  it("passes a page within budget", () => {
    const root = page(
      '<div data-tone="hero">£48,250</div><p>£320 left over</p><p role="note" data-notice="projection">Projection</p>',
    );
    expect(() =>
      expectPageRules(root, { maxFigures: 4, maxNotSet: 1, projectionNotices: 1 }),
    ).not.toThrow();
  });

  it("fails over maxFigures and lists the figures it found", () => {
    const root = page("<p>£1</p><p>£2</p><p>5%</p>");
    expect(() => expectPageRules(root, { maxFigures: 2 })).toThrow(
      /3 figures, more than the 2 allowed: money "£1", money "£2", percent "5%"/,
    );
  });

  it("fails over maxNotSet", () => {
    const root = page("<p>Not set</p><p>Not set</p>");
    expect(() => expectPageRules(root, { maxNotSet: 1 })).toThrow(/"Not set" 2 times/);
    expect(() => expectPageRules(root, { maxNotSet: 2 })).not.toThrow();
  });

  it("fails with two hero blocks", () => {
    const root = page('<div data-tone="hero">£1</div><div data-tone="hero">£2</div>');
    expect(() => expectPageRules(root)).toThrow(/2 hero blocks/);
  });

  it("fails with two shown primary buttons, counting links and ignoring hidden ones (P7.4)", () => {
    const one = page(
      '<button data-variant="primary">Save</button><button data-variant="secondary">Cancel</button>' +
        '<div hidden><button data-variant="primary">Hidden</button></div>' +
        '<div aria-hidden="true"><a data-variant="primary" href="#">Hidden</a></div>' +
        '<div data-variant="primary">Not a button</div>',
    );
    expect(() => expectPageRules(one)).not.toThrow();
    const two = page(
      '<button data-variant="primary">Save</button><a data-variant="primary" href="#">Add</a>',
    );
    expect(() => expectPageRules(two)).toThrow(/2 primary buttons; at most one/);
  });

  it("allows no projection notice by default, fails with two", () => {
    expect(() => expectPageRules(page("<p>£1</p>"))).not.toThrow();
    const root = page('<p data-notice="projection">One</p><p data-notice="projection">Two</p>');
    expect(() => expectPageRules(root)).toThrow(/2 projection notices; at most one/);
  });

  it("checks an exact projection notice count when given", () => {
    expect(() => expectPageRules(page("<p>£1</p>"), { projectionNotices: 1 })).toThrow(
      /0 projection notices; expected 1/,
    );
    expect(() =>
      expectPageRules(page('<p data-notice="projection">Note</p>'), { projectionNotices: 0 }),
    ).toThrow(/1 projection notices; expected 0/);
  });

  it("fails when a projection notice sits above the h1", () => {
    const root = dom('<p data-notice="projection">Note</p><h1>Debt</h1>');
    expect(() => expectPageRules(root)).toThrow(/notice sits above the h1/);
  });

  it("reports every breach in one error", () => {
    const root = dom(
      '<p data-notice="projection">A</p><h1>Debt</h1><div data-tone="hero">£1</div><div data-tone="hero">£2</div>',
    );
    let message = "";
    try {
      expectPageRules(root, { maxFigures: 1 });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/^Page rules failed:/);
    expect(message).toMatch(/2 figures/);
    expect(message).toMatch(/2 hero blocks/);
    expect(message).toMatch(/above the h1/);
  });
});
