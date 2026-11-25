import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import {
  WELLBEING_SETTING_ERROR,
  WellbeingQuestionsSetting,
  type WellbeingQuestionsSettingProps,
} from "./WellbeingQuestionsSetting";

const toast = vi.fn();
vi.mock("@repo/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@repo/ui")>()),
  useOptionalToast: () => ({ toast }),
}));

const setup = (props: Partial<WellbeingQuestionsSettingProps> = {}) => {
  const onSave = props.onSave ?? vi.fn().mockResolvedValue(undefined);
  render(<WellbeingQuestionsSetting enabled={true} onSave={onSave} {...props} />);
  return { onSave };
};

const control = () =>
  screen.getByRole("switch", {
    name: "Ask two optional questions after a check-in",
  }) as HTMLInputElement;

describe("<WellbeingQuestionsSetting />", () => {
  test("a Questions after a check-in section whose hint says switching off deletes answers", () => {
    setup();
    const section = screen.getByRole("region", { name: "Questions after a check-in" });
    expect(section.id).toBe("settings-wellbeing-questions");
    const hint = document.getElementById(
      control().getAttribute("aria-describedby") ?? "",
    )?.textContent;
    expect(hint).toBe(
      "At most once in each quarter of the year. Switching this off also deletes your earlier answers.",
    );
  });

  test("shows the saved state both ways", () => {
    setup({ enabled: false });
    expect(control().checked).toBe(false);
  });

  test("switching off saves the field straight away, with no question first", async () => {
    toast.mockClear();
    const { onSave } = setup();
    await userEvent.click(control());
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({ wellbeingQuestions: false });
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Saved", tone: "positive" }));
    expect(control().checked).toBe(false);
  });

  test("switching on saves true", async () => {
    const { onSave } = setup({ enabled: false });
    await userEvent.click(control());
    expect(onSave).toHaveBeenCalledWith({ wellbeingQuestions: true });
    await waitFor(() => expect(control().checked).toBe(true));
  });

  test("goes back and says so when the save fails", async () => {
    toast.mockClear();
    setup({ onSave: vi.fn().mockRejectedValue(new Error("failed")) });
    await userEvent.click(control());
    expect((await screen.findByRole("alert")).textContent).toBe(WELLBEING_SETTING_ERROR);
    expect(control().checked).toBe(true);
    expect(toast).not.toHaveBeenCalled();
  });
});
