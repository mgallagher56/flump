import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { WellbeingQuestionsApi } from "../../wellbeingQuestions";
import { WellbeingQuestions } from "./WellbeingQuestions";

const setup = (
  opts: { due?: boolean; loadFails?: boolean; send?: WellbeingQuestionsApi["send"] } = {},
) => {
  const send = vi.fn(opts.send ?? (async () => {}));
  const loadStatus = vi.fn(async () => {
    if (opts.loadFails) throw new Error("unavailable");
    return opts.due ?? true;
  });
  const onFinished = vi.fn();
  render(<WellbeingQuestions api={{ loadStatus, send }} onFinished={onFinished} />);
  return { send, loadStatus, onFinished };
};

const card = () => screen.findByRole("region", { name: "Two optional questions" });

describe("WellbeingQuestions", () => {
  it("shows nothing when not due", async () => {
    const { loadStatus } = setup({ due: false });
    await vi.waitFor(() => expect(loadStatus).toHaveBeenCalledTimes(1));
    await Promise.resolve();
    expect(screen.queryByTestId("wellbeing-questions")).toBeNull();
    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("shows nothing when the status cannot be loaded", async () => {
    const { loadStatus } = setup({ loadFails: true });
    await vi.waitFor(() => expect(loadStatus).toHaveBeenCalledTimes(1));
    await Promise.resolve();
    expect(screen.queryByTestId("wellbeing-questions")).toBeNull();
  });

  it("asks both questions when due, with no answer chosen", async () => {
    setup();
    await card();
    const group = screen.getByRole("group", {
      name: "After this check-in, how do you feel about your money?",
    });
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(group.contains(radios[0] ?? null)).toBe(true);
    expect(radios.map((r) => r.labels?.[0]?.textContent)).toEqual([
      "More in control",
      "About the same",
      "More worried",
    ]);
    expect(radios.every((r) => !r.checked)).toBe(true);
    const text = screen.getByRole("textbox", {
      name: "Did anything here make you feel worse? Tell us what.",
    }) as HTMLTextAreaElement;
    expect(text.maxLength).toBe(1000);
    expect(text.getAttribute("aria-describedby")).toBe("wellbeing-worse-text-hint");
    expect(screen.getByText(/Please leave out health details/).id).toBe(
      "wellbeing-worse-text-hint",
    );
    // No figure, score or comparison anywhere in it.
    expect(screen.getByTestId("wellbeing-questions").textContent).not.toMatch(/[£%0-9]/);
  });

  it("sends the chosen answer and the trimmed text, then says thank you in its place", async () => {
    const user = userEvent.setup();
    const { send, onFinished } = setup();
    await card();
    await user.click(screen.getByRole("radio", { name: "More worried" }));
    await user.type(screen.getByRole("textbox"), "  The debt total  ");
    await user.click(screen.getByRole("button", { name: "Send answers" }));
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ feeling: "more_worried", worseText: "The debt total" });
    expect(screen.queryByTestId("wellbeing-questions")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("Thank you for your answers.");
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it("sends the text alone as null feeling", async () => {
    const user = userEvent.setup();
    const { send } = setup();
    await card();
    await user.type(screen.getByRole("textbox"), "Too many figures");
    await user.click(screen.getByRole("button", { name: "Send answers" }));
    expect(send).toHaveBeenCalledWith({ feeling: null, worseText: "Too many figures" });
  });

  it("Skip sends both as null and removes the card with no message", async () => {
    const user = userEvent.setup();
    const { send, onFinished } = setup();
    await card();
    await user.click(screen.getByRole("radio", { name: "About the same" }));
    await user.click(screen.getByRole("button", { name: "Skip" }));
    expect(send).toHaveBeenCalledWith({ feeling: null, worseText: null });
    expect(screen.queryByTestId("wellbeing-questions")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("");
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it("counts Send with nothing chosen and only spaces typed as a skip", async () => {
    const user = userEvent.setup();
    const { send } = setup();
    await card();
    await user.type(screen.getByRole("textbox"), "   ");
    await user.click(screen.getByRole("button", { name: "Send answers" }));
    expect(send).toHaveBeenCalledWith({ feeling: null, worseText: null });
    expect(screen.queryByTestId("wellbeing-questions")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("keeps the card and the answers when sending fails, and says nothing was saved", async () => {
    const user = userEvent.setup();
    const { send, onFinished } = setup({
      send: async () => {
        throw new Error("unavailable");
      },
    });
    await card();
    await user.click(screen.getByRole("radio", { name: "More in control" }));
    await user.click(screen.getByRole("button", { name: "Send answers" }));
    expect(send).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alert").textContent).toBe(
      "Error: We could not send that. Nothing was saved. Try again.",
    );
    expect(screen.getByTestId("wellbeing-questions")).toBeDefined();
    expect(
      (screen.getByRole("radio", { name: "More in control" }) as HTMLInputElement).checked,
    ).toBe(true);
    expect(screen.getByRole("status").textContent).toBe("");
    expect(onFinished).not.toHaveBeenCalled();
  });

  it("sends once while a send is in flight", async () => {
    const user = userEvent.setup();
    let finish: () => void = () => {};
    const { send } = setup({ send: () => new Promise<void>((r) => (finish = r)) });
    await card();
    await user.click(screen.getByRole("radio", { name: "More in control" }));
    await user.click(screen.getByRole("button", { name: "Send answers" }));
    await user.click(screen.getByRole("button", { name: "Send answers" }));
    expect(send).toHaveBeenCalledTimes(1);
    finish();
    expect(await screen.findByText("Thank you for your answers.")).toBeDefined();
  });
});
