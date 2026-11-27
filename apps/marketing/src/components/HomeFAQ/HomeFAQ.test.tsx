import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { GsapKit } from "../../motion/loadGsapKit";
import { faqMoment, HOME_FAQS, HomeFAQ } from "./HomeFAQ";

vi.mock("../../motion/useGsapMoment", () => ({ useGsapMoment: vi.fn() }));

const renderFaq = () =>
  render(
    <MemoryRouter>
      <HomeFAQ />
    </MemoryRouter>,
  );

describe("HomeFAQ", () => {
  it("renders FAQs and allows accordion toggling", () => {
    renderFaq();
    const firstButton = screen.getByRole("button", {
      name: /Do I have to connect my bank accounts\?/i,
    });
    expect(firstButton.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(firstButton);
    expect(firstButton.getAttribute("aria-expanded")).toBe("false");

    const secondButton = screen.getByRole("button", {
      name: /Which UK rules does Flump use\?/i,
    });
    expect(secondButton.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(secondButton);
    expect(secondButton.getAttribute("aria-expanded")).toBe("true");
  });

  it("question toggles are native buttons exposing the expanded state", () => {
    renderFaq();
    const button = screen.getByRole("button", { name: /Is Flump free\?/i });
    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("type")).toBe("button");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("region", { name: /connect my bank accounts/i })).toBeDefined();
  });

  it("leaves the payments fact to the security strip and makes no regulatory claim", () => {
    const { container } = renderFaq();
    expect(screen.queryByRole("button", { name: /move my money/i })).toBeNull();
    expect(container.textContent ?? "").not.toMatch(/only reads|choose to share|US tax rules/i);
    expect(container.textContent ?? "").not.toMatch(/FCA|AISP|regulated by/);
  });

  it("says 'free' only with its beta condition, matching the pricing page", () => {
    renderFaq();
    fireEvent.click(screen.getByRole("button", { name: /Is Flump free\?/i }));
    expect(
      screen.getByText(
        "Flump is free during the beta. A paid plan may come later and its price is not set.",
      ),
    ).toBeDefined();
    expect(screen.queryByText(/not been announced|free tier|credit card/i)).toBeNull();
  });

  it("does not promise bank connection", () => {
    renderFaq();
    // The bank question is first, so it is open on arrival.
    expect(screen.getByRole("region", { name: /Do I have to connect/ }).textContent).not.toMatch(
      /coming soon|bank connection/i,
    );
  });

  it("names the app's areas, never the retired 'forecast tools' (E16 D5-B, E42)", () => {
    const { container } = renderFaq();
    expect(container.textContent ?? "").toMatch(
      /accounts, budget, pay, savings and pension, and debt and borrowing/,
    );
    expect(container.textContent ?? "").not.toMatch(/forecast|what does flump cover/i);
  });

  it("says how a tester gets the AI connection and links its page (D5, E42)", () => {
    renderFaq();
    fireEvent.click(screen.getByRole("button", { name: /AI assistant/i }));
    expect(screen.getByText(/switched on one account at a time/)).toBeDefined();
    expect(screen.queryByText(/as a preview/)).toBeNull();
    expect(screen.getByRole("link", { name: "About the AI connection" }).getAttribute("href")).toBe(
      "/features/ai-connection",
    );
  });
});

describe("HomeFAQ: the band and the answers opening in place (MK9)", () => {
  it("is the canvas band with the anchor the page links to", () => {
    renderFaq();
    const band = screen.getByRole("region", { name: "Frequently asked questions" });
    expect(band.id).toBe("faq");
    expect(band.getAttribute("data-tone-band")).toBe("canvas");
  });

  it("keeps every answer in the page, in order; only the open one is reachable", () => {
    const { container } = renderFaq();
    const answers = [...container.querySelectorAll("section[id^=faq-answer-]")];
    expect(answers.map((a) => a.id)).toEqual(HOME_FAQS.map((f) => `faq-answer-${f.id}`));
    expect(answers.map((a) => a.hasAttribute("inert"))).toEqual([false, true, true, true, true]);
    expect(answers.map((a) => a.getAttribute("data-open"))).toEqual([
      "true",
      "false",
      "false",
      "false",
      "false",
    ]);
  });

  it("opens one answer at a time, and the keyboard reaches each question in order", () => {
    const { container } = renderFaq();
    const free = screen.getByRole("button", { name: /Is Flump free\?/ });
    fireEvent.click(free);
    const open = [...container.querySelectorAll("section[data-open=true]")].map((a) => a.id);
    expect(open).toEqual(["faq-answer-pricing"]);
    expect(container.querySelector("#faq-answer-bank")?.hasAttribute("inert")).toBe(true);
    expect(free.getAttribute("aria-controls")).toBe("faq-answer-pricing");
    const questions = within(screen.getByRole("list")).getAllByRole("button");
    expect(questions.map((b) => b.id)).toEqual(HOME_FAQS.map((f) => `faq-question-${f.id}`));
  });
});

describe("HomeFAQ: dealing in (MK2)", () => {
  it("deals the questions in once, in document order, by time and never by scroll", () => {
    renderFaq();
    const list = screen.getByRole("list");
    const from = vi.fn();
    faqMoment({ gsap: { from } } as unknown as GsapKit, list);
    expect(from).toHaveBeenCalledTimes(1);
    const [targets, vars] = from.mock.calls[0] as [Element[], Record<string, unknown>];
    expect(targets).toEqual(within(list).getAllByRole("listitem"));
    // durations.marketing.entry 1,540 ms and stagger 196 ms, in seconds; the calm ease.
    expect(vars).toMatchObject({ y: 12, opacity: 0, duration: 1.54, stagger: 0.196, ease: "calm" });
    // Cleared afterwards, so an opening answer pushes the next question down.
    expect(vars.clearProps).toBe("transform,opacity");
    expect(vars.scrollTrigger).toMatchObject({ trigger: list, once: true });
    expect((vars.scrollTrigger as Record<string, unknown>).scrub).toBeUndefined();
  });

  it("does nothing on a list with no items", () => {
    const from = vi.fn();
    faqMoment({ gsap: { from } } as unknown as GsapKit, document.createElement("ul"));
    expect(from).not.toHaveBeenCalled();
  });
});
