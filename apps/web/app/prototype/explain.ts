/*
 * PROTOTYPE ONLY (app design prototypes branch, never merged).
 *
 * "Every calculated figure explains itself": at level 2 each calculated headline figure gets an
 * info button whose popover shows the working with the actual numbers. The numbers are read from
 * the figures already on the page, and a working is shown only when its sum matches the figure on
 * screen to the pound; otherwise the existing words stay and the inventory says what is missing.
 * Production would build each working from the finance engine's own parts, not the page.
 *
 * Native popover (a real button, opens on click, Enter and Space, closes on Escape), placed under
 * its button with CSS anchor positioning. Plain DOM nodes, marked `data-proto-explain`, removed on
 * every page change.
 */

const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(n);

const parse = (text: string | null | undefined): number | null => {
  if (!text) return null;
  const m = text.replace(/,/g, "").match(/(−|-)?£\s?(\d+(?:\.\d+)?)/);
  if (!m) return null;
  return (m[1] ? -1 : 1) * Number(m[2]);
};

/** The value of the KPI card whose label starts with `label`. */
const kpi = (root: ParentNode, label: string): number | null => {
  for (const card of root.querySelectorAll<HTMLElement>("[data-kpi-card]")) {
    const eyebrow = card.querySelector("[data-kpi-eyebrow]")?.textContent ?? "";
    if (eyebrow.trim().startsWith(label)) {
      return parse(card.querySelector("[data-kpi-value]")?.textContent);
    }
  }
  return null;
};

const hero = (): { el: HTMLElement; value: number | null } | null => {
  const el =
    document.querySelector<HTMLElement>("main [data-testid='hero-figure']") ??
    document.querySelector<HTMLElement>("main [data-tone='hero'][role='group']");
  if (!el) return null;
  const fig = el.querySelector("[data-figure]") ?? el;
  return { el, value: parse(fig.textContent) };
};

/** Rows of a list region: name and amount of each row in the section titled `title`. */
const rowsUnder = (title: RegExp): Array<{ name: string; value: number }> => {
  const heading = [...document.querySelectorAll("main h2")].find((h) =>
    title.test(h.textContent ?? ""),
  );
  const section = heading?.closest("section") ?? heading?.parentElement?.parentElement;
  if (!section) return [];
  const rows: Array<{ name: string; value: number }> = [];
  for (const li of section.querySelectorAll("li")) {
    const value = parse(li.textContent);
    // The row's name: its first piece of text.
    const walker = document.createTreeWalker(li, NodeFilter.SHOW_TEXT);
    let name = "";
    while (!name && walker.nextNode()) name = walker.currentNode.textContent?.trim() ?? "";
    if (value !== null && name) rows.push({ name, value });
  }
  return rows;
};

interface Working {
  /** The card holding the figure the button explains. */
  card: HTMLElement;
  text: string;
}

type Rule = () => Working | null;

const sumWorking = (
  total: { el: HTMLElement; value: number | null } | null,
  rows: Array<{ name: string; value: number }>,
  noun: string,
): Working | null => {
  if (!total || total.value === null || rows.length === 0) return null;
  const sum = rows.reduce((a, r) => a + r.value, 0);
  if (Math.round(sum) !== Math.round(total.value)) return null;
  const parts = rows.map((r) => `${gbp(r.value)} ${r.name}`).join(" + ");
  return { card: total.el, text: `${parts} = ${gbp(total.value)} ${noun}.` };
};

/** The total shown in the section titled `title`, outside its rows. */
const sectionTotal = (title: RegExp): number | null => {
  const heading = [...document.querySelectorAll("main h2")].find((h) =>
    title.test(h.textContent ?? ""),
  );
  const section = heading?.closest("section");
  if (!section) return null;
  for (const el of section.querySelectorAll("*")) {
    if (el.children.length > 0 || el.closest("li")) continue;
    const v = parse(el.textContent);
    if (v !== null && /^[−-]?£[\d,]+$/.test((el.textContent ?? "").trim())) return v;
  }
  return null;
};

const RULES: Record<string, Rule[]> = {
  "/app/accounts": [
    () => {
      const total = document.querySelector<HTMLElement>("main [data-tone='hero']");
      const value = parse(total?.querySelector("[data-figure]")?.textContent ?? total?.textContent);
      const own = sectionTotal(/^What you own/);
      const owe = sectionTotal(/^What you owe/);
      if (!total || value === null || own === null || owe === null) return null;
      if (Math.round(own - owe) !== Math.round(value)) return null;
      return {
        card: total,
        text: `${gbp(own)} what you own − ${gbp(owe)} what you owe = ${gbp(value)}. Accounts you have chosen not to count, such as a student loan, are left out.`,
      };
    },
  ],
  "/app/budget": [
    () => {
      const h = hero();
      const moneyIn = kpi(document, "Money in each month");
      const out = kpi(document, "Going out each month");
      if (!h || h.value === null || moneyIn === null || out === null) return null;
      if (Math.round(moneyIn - out) !== Math.round(h.value)) return null;
      return {
        card: h.el,
        text: `${gbp(moneyIn)} money in − ${gbp(out)} going out = ${gbp(h.value)} left over each month. Money in is your income after tax. Going out is the bills, spending and savings in your budget.`,
      };
    },
  ],
  "/app/take-home": [
    () => {
      const h = hero();
      const gross = kpi(document, "Monthly pay before tax");
      const tax = kpi(document, "Tax and National Insurance");
      const other = kpi(document, "Pension and student loan");
      if (!h || h.value === null || gross === null || tax === null || other === null) return null;
      if (Math.round(gross - tax - other) !== Math.round(h.value)) return null;
      return {
        card: h.el,
        text: `${gbp(gross)} pay before tax − ${gbp(tax)} tax and National Insurance − ${gbp(other)} pension and student loan = ${gbp(h.value)} take-home pay a month.`,
      };
    },
  ],
  "/app/debt": [() => sumWorking(hero(), rowsUnder(/^Your debts/), "you owe in total")],
  "/app/savings": [() => sumWorking(hero(), rowsUnder(/^Your accounts/), "in savings in total")],
  "/app/pension": [() => sumWorking(hero(), rowsUnder(/pots|pensions/i), "in pensions in total")],
};

let counter = 0;

export const clearExplains = () => {
  for (const el of document.querySelectorAll("[data-proto-explain]")) el.remove();
  for (const el of document.querySelectorAll<HTMLElement>("[data-proto-replaced]")) {
    el.style.removeProperty("display");
    el.removeAttribute("data-proto-replaced");
  }
};

/** Adds the info buttons for this page; returns how many it placed. */
export const placeExplains = (pathname: string): number => {
  clearExplains();
  const rules = RULES[pathname] ?? [];
  let placed = 0;
  for (const rule of rules) {
    const working = rule();
    if (!working) continue;
    const { card, text } = working;
    // The card's label line: the first paragraph, which holds today's info button if there is one.
    const existing = card.querySelector<HTMLElement>("button[aria-haspopup], button[data-state]");
    const label =
      existing?.parentElement ?? card.querySelector<HTMLElement>("p, [data-kpi-eyebrow]");
    if (!label) continue;
    counter += 1;
    const id = `proto-explain-${counter}`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "proto-explain__button";
    button.dataset.protoExplain = "";
    button.setAttribute("popovertarget", id);
    button.setAttribute("aria-label", "How this is worked out");
    button.style.setProperty("anchor-name", `--${id}`);
    button.innerHTML =
      '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>';
    const pop = document.createElement("div");
    pop.id = id;
    pop.setAttribute("popover", "auto");
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-label", "How this is worked out");
    pop.className = "proto-explain__popover";
    pop.dataset.protoExplain = "";
    pop.style.setProperty("position-anchor", `--${id}`);
    const title = document.createElement("p");
    title.className = "proto-explain__title";
    title.textContent = "How this is worked out";
    const body = document.createElement("p");
    body.textContent = text;
    pop.append(title, body);
    if (existing) {
      existing.dataset.protoReplaced = "";
      existing.style.display = "none";
      existing.after(button);
    } else {
      label.append(button);
    }
    button.after(pop);
    placed += 1;
  }
  return placed;
};
