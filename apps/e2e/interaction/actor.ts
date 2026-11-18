import type { Locator, Page } from "@playwright/test";
import type { InteractionCounter } from "./counter";
import type { RunMode } from "./report";

/** More Tab presses than this to reach one control fails the flow: it is not reachable. */
export const MAX_TAB_HOPS = 120;

/**
 * Drives a flow the way a person would, in one of three modes, using only real input events, so
 * the counter sees what the person would do:
 *
 * - `desktop-pointer`: mouse clicks; to replace a field's text, click it, Ctrl/Cmd+A, type.
 * - `phone-touch`: the same with taps.
 * - `desktop-keyboard`: Tab forward until the control has focus, then Enter (Space for a checkbox,
 *   switch or radio). Tabbing into a text field selects its text, so typing replaces it. Within a
 *   radio group or an open menu the arrow keys move, as they do for a person.
 *
 * Text is typed key by key, so every character is a keystroke. The one thing not sent as real
 * input is picking an option from a native `<select>` with a pointer (the list is drawn by the
 * browser, outside the page): it is set directly and counted as a click (`syntheticClicks`).
 * Scrolling is not counted; Playwright scrolls a control into view before using it.
 */
export class Actor {
  constructor(
    readonly page: Page,
    readonly mode: RunMode,
    private readonly counter: InteractionCounter,
  ) {}

  get keyboardOnly(): boolean {
    return this.mode === "desktop-keyboard";
  }

  /** Activates a button, link, tab, checkbox, switch or radio. */
  async press(target: Locator): Promise<void> {
    if (this.mode === "desktop-pointer") return target.click();
    if (this.mode === "phone-touch") return target.tap();
    const kind = await controlKind(target);
    if (kind === "radio") return this.chooseRadio(target);
    if (kind === "menuitem") return this.arrowTo(target);
    await this.tabTo(target);
    await this.page.keyboard.press(kind === "toggle" ? " " : "Enter");
  }

  /** Puts `text` into a text field, replacing what is there. */
  async type(field: Locator, text: string): Promise<void> {
    if (this.keyboardOnly) {
      await this.tabTo(field);
      // Tab selects a text field's contents, but a field may reformat itself on focus (the value
      // pills turn "£0" into "0") and lose the selection. Let that settle, then look.
      await nextFrames(this.page);
      // A field that kept only a caret needs its text selected first.
      if (!(await fullySelected(field))) await this.page.keyboard.press("ControlOrMeta+a");
    } else {
      await (this.mode === "phone-touch" ? field.tap() : field.click());
      if ((await field.inputValue()) !== "") await this.page.keyboard.press("ControlOrMeta+a");
    }
    await this.page.keyboard.type(text);
  }

  /** Picks the option labelled `label` in a native select. */
  async choose(select: Locator, label: string): Promise<void> {
    if (!this.keyboardOnly) {
      await (this.mode === "phone-touch" ? select.tap() : select.click());
      await select.selectOption({ label });
      this.counter.addSyntheticClick();
      return;
    }
    await this.tabTo(select);
    // Type-ahead: the shortest start of the label that only that option has.
    const prefix = await select.evaluate((el, wanted) => {
      const labels = [...(el as HTMLSelectElement).options].map((o) => o.label.toLowerCase());
      const target = wanted.toLowerCase();
      for (let n = 1; n <= target.length; n++) {
        const start = target.slice(0, n);
        if (labels.filter((l) => l.startsWith(start)).length === 1) return wanted.slice(0, n);
      }
      return wanted;
    }, label);
    await this.page.keyboard.type(prefix);
    const picked = await select.evaluate(
      (el) => (el as HTMLSelectElement).selectedOptions[0]?.label ?? "",
    );
    if (picked !== label) throw new Error(`Typing "${prefix}" picked "${picked}", not "${label}"`);
  }

  /** A key press, the same in every mode (Enter to submit, Escape to close). */
  async key(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  /** Presses Tab until `target` has focus. Throws after MAX_TAB_HOPS. */
  async tabTo(target: Locator): Promise<void> {
    await target.waitFor({ state: "visible" });
    for (let hops = 0; hops <= MAX_TAB_HOPS; hops++) {
      if (await hasFocus(target)) return;
      await this.page.keyboard.press("Tab");
    }
    throw new Error(`Not reachable with Tab within ${MAX_TAB_HOPS} presses: ${target}`);
  }

  /**
   * An open menu takes focus on its first item; ArrowDown moves down and stops at the last item,
   * so turn round there. Focus moves just after the key press: wait for it before checking.
   */
  private async arrowTo(target: Locator): Promise<void> {
    await target.waitFor({ state: "visible" });
    let key = "ArrowDown";
    for (let moves = 0; moves < 20; moves++) {
      if (await hasFocus(target)) return this.page.keyboard.press("Enter");
      const before = await focusedText(this.page);
      await this.page.keyboard.press(key);
      const moved = await this.page
        .waitForFunction((was) => document.activeElement?.textContent !== was, before, {
          timeout: 1_000,
        })
        .then(() => true)
        .catch(() => false);
      if (!moved) key = key === "ArrowDown" ? "ArrowUp" : "ArrowDown";
    }
    throw new Error(`Could not reach the menu item with the arrow keys: ${target}`);
  }

  /**
   * Tab lands on a radio group's checked radio, or its first when none is checked; Space picks
   * the focused one and the arrow keys move (and pick) within the group. Native radios only.
   */
  private async chooseRadio(target: Locator): Promise<void> {
    const name = await target.evaluate((el) =>
      el instanceof HTMLInputElement && el.type === "radio" ? el.name : "",
    );
    if (!name) throw new Error(`Only native radio inputs with a name are supported: ${target}`);
    const inGroup = () =>
      this.page.evaluate((group) => {
        const el = document.activeElement;
        return el instanceof HTMLInputElement && el.type === "radio" && el.name === group;
      }, name);
    for (let hops = 0; !(await inGroup()); hops++) {
      if (hops >= MAX_TAB_HOPS)
        throw new Error(
          `Radio group not reachable with Tab within ${MAX_TAB_HOPS} presses: ${target}`,
        );
      await this.page.keyboard.press("Tab");
    }
    if (await target.isChecked()) return;
    if (await hasFocus(target)) return this.page.keyboard.press(" ");
    for (let moves = 0; moves < 12; moves++) {
      await this.page.keyboard.press("ArrowDown");
      if (await target.isChecked()) return;
    }
    throw new Error(`Could not reach the radio with the arrow keys: ${target}`);
  }
}

/** Strict: a locator that matches several elements throws rather than reading as "not focused". */
async function hasFocus(target: Locator): Promise<boolean> {
  return target.evaluate((el) => el === document.activeElement);
}

/** Two animation frames: effects that run on focus have rendered. */
async function nextFrames(page: Page): Promise<void> {
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}

function focusedText(page: Page): Promise<string | null> {
  return page.evaluate(() => document.activeElement?.textContent ?? null);
}

async function fullySelected(field: Locator): Promise<boolean> {
  return field.evaluate((el) => {
    const input = el as HTMLInputElement;
    if (input.value === "") return true;
    return input.selectionStart === 0 && input.selectionEnd === input.value.length;
  });
}

async function controlKind(target: Locator): Promise<"toggle" | "radio" | "menuitem" | "other"> {
  return target.evaluate((el) => {
    const role = el.getAttribute("role");
    const type = (el as HTMLInputElement).type;
    if (role === "radio" || (el.tagName === "INPUT" && type === "radio")) return "radio";
    if (role?.startsWith("menuitem")) return "menuitem";
    if (role === "checkbox" || role === "switch") return "toggle";
    if (el.tagName === "INPUT" && type === "checkbox") return "toggle";
    return "other";
  });
}
