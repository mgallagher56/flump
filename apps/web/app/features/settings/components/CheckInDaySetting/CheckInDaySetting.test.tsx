import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import {
  CHECK_IN_DAY_ERROR,
  CHECK_IN_DAY_HINT,
  CheckInDaySetting,
  type CheckInDaySettingProps,
  ordinalDay,
} from "./CheckInDaySetting";

const toast = vi.fn();
vi.mock("@repo/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@repo/ui")>()),
  useOptionalToast: () => ({ toast }),
}));

const setup = (props: Partial<CheckInDaySettingProps> = {}) => {
  const onSave = props.onSave ?? vi.fn().mockResolvedValue(undefined);
  render(<CheckInDaySetting checkInDay={null} onSave={onSave} {...props} />);
  return { onSave };
};

const select = () => screen.getByRole("combobox", { name: "Check-in day" }) as HTMLSelectElement;

describe("<CheckInDaySetting />", () => {
  test("a Monthly check-in section anchored at #settings-check-in with the hint", () => {
    setup();
    const section = screen.getByRole("region", { name: "Monthly check-in" });
    expect(section.id).toBe("settings-check-in");
    expect(section.textContent).toContain(CHECK_IN_DAY_HINT);
    expect(section.textContent).not.toMatch(/remind|email|overdue|streak/i);
  });

  test("offers the 1st to the 31st and shows the 1st when no day is chosen", () => {
    setup();
    expect(select().value).toBe("1");
    const labels = Array.from(select().options).map((o) => o.textContent);
    expect(labels).toHaveLength(31);
    expect(labels.slice(0, 4)).toEqual(["1st", "2nd", "3rd", "4th"]);
    expect(labels.at(-1)).toBe("31st");
  });

  test("shows the saved day", () => {
    setup({ checkInDay: 28 });
    expect(select().value).toBe("28");
  });

  test("saves straight away on change and says Saved", async () => {
    toast.mockClear();
    const { onSave } = setup();
    await userEvent.selectOptions(select(), "28");
    expect(onSave).toHaveBeenCalledWith({ checkInDay: 28 });
    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Saved", tone: "positive" }));
    expect(select().value).toBe("28");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("goes back and says so when the save fails", async () => {
    toast.mockClear();
    setup({ checkInDay: 5, onSave: vi.fn().mockRejectedValue(new Error("failed")) });
    await userEvent.selectOptions(select(), "20");
    expect((await screen.findByRole("alert")).textContent).toBe(CHECK_IN_DAY_ERROR);
    expect(select().value).toBe("5");
    expect(toast).not.toHaveBeenCalled();
  });
});

describe("ordinalDay", () => {
  test("writes en-GB ordinals", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 30, 31].map(ordinalDay)).toEqual([
      "1st",
      "2nd",
      "3rd",
      "4th",
      "11th",
      "12th",
      "13th",
      "21st",
      "22nd",
      "23rd",
      "30th",
      "31st",
    ]);
  });
});
