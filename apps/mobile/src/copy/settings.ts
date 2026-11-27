/**
 * Settings words (E12 S9, plan 9.10), copied from web so both apps say the same: the settings tabs
 * (`settings-tabs.ts`), `ProfileTab`, `NetWorthChoices`, `CheckInDaySetting`, `SecurityTab`,
 * web's conflict message (`services/conflict.ts`) and the header's colour theme button
 * (`ThemeToggle`). Web's `settingsCopyParity.test.tsx` pins each one to web's own. The words only
 * the app needs (This phone, the website links) follow web's style. Replaced by `packages/copy`
 * when P5 lands.
 *
 * Copy guide rules: plain en-GB, sentence case, no exclamation marks. The net worth choices state
 * what each one does and never suggest which is better (advice policy R1).
 */
import { ordinalDay } from "@flump/format";
import type { ThemePreference } from "../device/themePreference";

export const SETTINGS = {
  /** Web's drawer row and page title (`settings` in common.json). */
  title: "Settings",
  /** Web's tab names, in web's order, with the app's own group for this phone. */
  profile: "Profile",
  phone: "This phone",
  security: "Security",
  data: "Data",
} as const;

/** What a save says, as web's Profile tab. */
export const SAVE = {
  /** Web's `PROFILE_SAVED_MESSAGE`. */
  saved: "Saved",
  /** Web's `PROFILE_SAVE_FAILED` (also the net worth and check-in day errors). */
  failed: "We could not save that change. Nothing has changed. Try again.",
  /** Web's Self Assessment error. */
  selfAssessmentFailed:
    "We could not change the Self Assessment section. Nothing has changed. Try again.",
  /** Web's `CONFLICT_MESSAGE`: refused with 412, the saved profile read again. */
  conflict:
    "We did not save this because it was changed somewhere else. The latest version is now loaded. Check it and save again.",
} as const;

export const PROFILE = {
  /** Web's "Your details" section. */
  detailsTitle: "Your details",
  firstName: "First name",
  lastName: "Last name",
  /** Web's `NET_WORTH_CHOICES_TITLE`, `PROPERTY_CHOICE_LABEL`, `STUDENT_LOAN_CHOICE_LABEL`. */
  netWorthTitle: "What counts in your net worth",
  countProperty: "Count property you own, less the mortgage on it",
  countStudentLoan: "Count your student loan as a debt",
  /** Web's `NET_WORTH_CHOICES_HELPER`. */
  netWorthHelper:
    "Other debts, including loans secured on your home, always count. Changes are saved straight away.",
  /** Web's `CHECK_IN_SETTING_TITLE`, `CHECK_IN_DAY_LABEL`, `CHECK_IN_DAY_HINT`. */
  checkInTitle: "Monthly check-in",
  checkInDay: "Check-in day",
  checkInDayHint: "In months with fewer days, the check-in falls on the last day of the month.",
  /** Web's "Sections you use" section and its Self Assessment switch. */
  sectionsTitle: "Sections you use",
  sectionsDescription: "Turn on extra sections for your menu and dashboard.",
  selfAssessment: "Self Assessment",
  selfAssessmentHint:
    "Income and expense records by tax year, for self-employed or rental income. Adds a tax page to your menu and dashboard.",
  /** The rest of web's Profile tab, which the app does not have yet. */
  moreOnWebsite:
    "Your picture, age and pay, tax details, partner mode, check-in questions, Connect AI and deleting your financial data are on the Flump website.",
  /** The website link's words when it opens web's settings. */
  openOnWebsite: "Open Settings on the website",
  loading: "Loading your profile",
} as const;

/** "1st" to "31st", as web's check-in day list (`ordinalDay` from `@flump/format`). */
export const checkInDayLabel = (day: number): string => ordinalDay(day);

export const SECURITY = {
  /** Web's "How you sign in" section. */
  title: "How you sign in",
  /** Web's account email label, and what it shows when the sign-in token carries no email. */
  email: "Account email",
  emailNotSet: "Your email cannot be shown here right now.",
  /** Web's button. In the app it opens the website, which emails the link. */
  changePassword: "Change password",
  /** The app never shows or takes a password, so the line says where it happens. */
  changePasswordLine: "You change your password on the Flump website, which emails you a link.",
  /** Restored without reaching Flump. */
  offline: "Changing your password needs a connection.",
} as const;

export const PHONE = {
  /** Web's `ThemeToggle` group name. */
  themeTitle: "Colour theme",
  themeHint: "System follows your phone's setting. Your choice stays on this phone.",
  system: "System",
  light: "Light",
  dark: "Dark",
} as const;

/** Web's cycle button label: "Colour theme: system. Change to light". */
export const themeCycleLabel = (current: ThemePreference, next: ThemePreference): string =>
  `Colour theme: ${current}. Change to ${next}`;
