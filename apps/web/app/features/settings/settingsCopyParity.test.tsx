// @vitest-environment node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ThemeToggle } from "@repo/ui";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  CHECK_IN_DAY_ERROR,
  CHECK_IN_DAY_HINT,
  CHECK_IN_DAY_LABEL,
  CHECK_IN_DAY_SAVED,
  CHECK_IN_SETTING_TITLE,
  ordinalDay,
} from "~/features/settings/components/CheckInDaySetting/CheckInDaySetting";
import {
  NET_WORTH_CHOICES_ERROR,
  NET_WORTH_CHOICES_HELPER,
  NET_WORTH_CHOICES_TITLE,
  PROPERTY_CHOICE_LABEL,
  STUDENT_LOAN_CHOICE_LABEL,
} from "~/features/settings/components/NetWorthChoices/NetWorthChoices";
import {
  PROFILE_SAVE_FAILED,
  PROFILE_SAVED_MESSAGE,
} from "~/features/settings/components/ProfileTab/ProfileTab";
import { settingsTabItems } from "~/features/settings/settings-tabs";
import { CONFLICT_MESSAGE } from "~/services/conflict";
import enCommon from "../../../public/locales/en/common.json";

/**
 * The mobile app's Settings say what web's Settings say (E12 S9, plan 9.10). The app keeps its words
 * in `apps/mobile/src/copy/settings.ts`; this test, run by web's suite so a web-only change fails at
 * once, pins them to web's own constants, and to the words web writes inline in its components. The
 * mobile file sits outside this project, so it is loaded by path (as `homeCopyParity.test.tsx`).
 */
const MOBILE_COPY = new URL("../../../../mobile/src/copy/settings.ts", import.meta.url);

type ThemePreference = "system" | "light" | "dark";
interface MobileSettings {
  SETTINGS: Record<string, string>;
  SAVE: Record<string, string>;
  PROFILE: Record<string, string>;
  SECURITY: Record<string, string>;
  PHONE: Record<string, string>;
  checkInDayLabel(day: number): string;
  themeCycleLabel(current: ThemePreference, next: ThemePreference): string;
}

const load = async () =>
  (await import(/* @vite-ignore */ fileURLToPath(MOBILE_COPY))) as MobileSettings;

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const EN: Record<string, string> = enCommon;

describe("the mobile Settings say what web's Settings say", () => {
  it("the list's title and pages are web's drawer row and tabs, in web's order", async () => {
    const { SETTINGS } = await load();
    expect(SETTINGS.title).toBe(EN.settings);
    const web = settingsTabItems(false).map((tab) => tab.label);
    // This phone is the app's own group, after Profile.
    expect([SETTINGS.profile, SETTINGS.security, SETTINGS.data]).toEqual(web);
  });

  it("a save's words: Saved, the failure and the change made somewhere else", async () => {
    const { SAVE } = await load();
    expect(SAVE.saved).toBe(PROFILE_SAVED_MESSAGE);
    expect(SAVE.saved).toBe(CHECK_IN_DAY_SAVED);
    expect(SAVE.failed).toBe(PROFILE_SAVE_FAILED);
    expect(SAVE.failed).toBe(NET_WORTH_CHOICES_ERROR);
    expect(SAVE.failed).toBe(CHECK_IN_DAY_ERROR);
    expect(SAVE.conflict).toBe(CONFLICT_MESSAGE);
    expect(source("./components/ProfileTab/ProfileTab.tsx")).toContain(
      `"${SAVE.selfAssessmentFailed}"`,
    );
  });

  it("the net worth choices, word for word", async () => {
    const { PROFILE } = await load();
    expect(PROFILE.netWorthTitle).toBe(NET_WORTH_CHOICES_TITLE);
    expect(PROFILE.countProperty).toBe(PROPERTY_CHOICE_LABEL);
    expect(PROFILE.countStudentLoan).toBe(STUDENT_LOAN_CHOICE_LABEL);
    expect(PROFILE.netWorthHelper).toBe(NET_WORTH_CHOICES_HELPER);
  });

  it("the check-in day: title, label, hint, and the 1st to the 31st", async () => {
    const { PROFILE, checkInDayLabel } = await load();
    expect(PROFILE.checkInTitle).toBe(CHECK_IN_SETTING_TITLE);
    expect(PROFILE.checkInDay).toBe(CHECK_IN_DAY_LABEL);
    expect(PROFILE.checkInDayHint).toBe(CHECK_IN_DAY_HINT);
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    expect(days.map(checkInDayLabel)).toEqual(days.map(ordinalDay));
  });

  it("the details and Sections you use, as ProfileTab writes them", async () => {
    const { PROFILE } = await load();
    const tab = source("./components/ProfileTab/ProfileTab.tsx");
    for (const words of [
      `title="${PROFILE.detailsTitle}"`,
      `label="${PROFILE.firstName}"`,
      `label="${PROFILE.lastName}"`,
      `title="${PROFILE.sectionsTitle}"`,
      `description="${PROFILE.sectionsDescription}"`,
      `label="${PROFILE.selfAssessment}"`,
      `hint="${PROFILE.selfAssessmentHint}"`,
    ]) {
      expect(tab).toContain(words);
    }
  });

  it("Security: the section, the email label and Change password, as SecurityTab writes them", async () => {
    const { SECURITY } = await load();
    const tab = source("./components/SecurityTab/SecurityTab.tsx");
    expect(tab).toContain(`title="${SECURITY.title}"`);
    expect(tab).toContain(`>${SECURITY.email}</p>`);
    expect(tab).toContain(`email || "${SECURITY.emailNotSet}"`);
    expect(tab).toContain(`${SECURITY.changePassword}\n            </Button>`);
  });

  it.each([
    ["system", "light"],
    ["light", "dark"],
    ["dark", "system"],
  ] as const)(
    "the header button on %s is named as web's ThemeToggle names it",
    async (current, next) => {
      const { themeCycleLabel } = await load();
      const markup = renderToStaticMarkup(
        createElement(ThemeToggle, { preference: current, onChange: () => {}, variant: "cycle" }),
      );
      const opening = 'aria-label="';
      const start = markup.indexOf(opening) + opening.length;
      const label = markup.slice(start, markup.indexOf('"', start));
      expect(start).toBeGreaterThan(opening.length - 1);
      expect(themeCycleLabel(current, next)).toBe(label);
    },
  );

  it("This phone's colour theme group has web's name", async () => {
    const { PHONE } = await load();
    const markup = renderToStaticMarkup(
      createElement(ThemeToggle, { preference: "system", onChange: () => {} }),
    );
    expect(markup).toContain(`aria-label="${PHONE.themeTitle}"`);
  });
});
