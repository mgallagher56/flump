import type { Page } from "@playwright/test";
import type { FlowCost } from "./report";

/**
 * Counts what a flow costs the user, from what the browser actually receives (E38 S0).
 *
 * An init script on every document listens, in the capture phase on `window`, for trusted
 * `pointerdown` events (one per click or tap) and trusted `keydown` events (one per key, so a
 * chord such as Ctrl+A is two), and watches how many dialogs are showing. It reports each one to
 * Node through an exposed binding, so the counts survive full page loads. Route changes come from
 * the main frame's `framenavigated` event, counted when the path changes (query and hash changes
 * are not route changes; a sheet opened by `?checkIn=1` is counted as a dialog instead).
 *
 * Nothing is counted until `start()`, so setup (the first `goto`, seeding) costs nothing.
 */

/** A dialog, alert dialog or open `<dialog>` that is on screen, outermost only. */
const DIALOG_SELECTOR = '[role="dialog"], [role="alertdialog"], dialog[open]';

const BINDING = "__flumpInteractionReport";

type CounterEvent =
  | { kind: "hello" }
  | { kind: "pointer"; pointerType: string }
  | { kind: "key"; key: string }
  | { kind: "dialogs"; open: number };

/** Runs in the page before any of its own scripts. Kept self-contained: it is serialised. */
function installListener(args: { binding: string; selector: string }): void {
  const w = window as unknown as Record<string, unknown>;
  const report = w[args.binding] as ((event: unknown) => void) | undefined;
  if (typeof report !== "function" || w.__flumpInteractionInstalled) return;
  w.__flumpInteractionInstalled = true;
  report({ kind: "hello" });

  window.addEventListener(
    "pointerdown",
    (event) => {
      if (event.isTrusted && event.isPrimary)
        report({ kind: "pointer", pointerType: event.pointerType });
    },
    true,
  );
  window.addEventListener(
    "keydown",
    (event) => {
      if (event.isTrusted && !event.repeat) report({ kind: "key", key: event.key });
    },
    true,
  );

  const visible = (el: Element): boolean => {
    if (el.closest("[hidden]")) return false;
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };
  let last = 0;
  const check = () => {
    const showing = [...document.querySelectorAll(args.selector)].filter(
      (el) => visible(el) && !el.parentElement?.closest(args.selector),
    ).length;
    if (showing !== last) {
      last = showing;
      report({ kind: "dialogs", open: showing });
    }
  };
  const observe = () => {
    new MutationObserver(check).observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["hidden", "open", "style", "class", "data-state", "aria-hidden"],
    });
    check();
  };
  if (document.documentElement) observe();
  else document.addEventListener("DOMContentLoaded", observe, { once: true });
}

export class InteractionCounter {
  private counting = false;
  private cost: FlowCost = emptyCost();
  private openDialogs = 0;
  private path: string | null = null;

  private constructor(private readonly page: Page) {}

  /** Installs the listener on every future document of `page`. Call before the first `goto`. */
  static async attach(page: Page): Promise<InteractionCounter> {
    const counter = new InteractionCounter(page);
    // Only the main frame's reports: an iframe would reset the dialog count with its own hello.
    await page.exposeBinding(BINDING, (source, event: CounterEvent) => {
      if (source.frame === page.mainFrame()) counter.record(event);
    });
    await page.addInitScript(installListener, { binding: BINDING, selector: DIALOG_SELECTOR });
    page.on("framenavigated", (frame) => {
      if (frame !== page.mainFrame()) return;
      const path = new URL(frame.url()).pathname;
      if (counter.counting && counter.path !== null && path !== counter.path)
        counter.cost.routeChanges++;
      counter.path = path;
    });
    return counter;
  }

  /**
   * Starts counting from zero, from the page as it is now. The round trip first lets reports
   * sent during setup arrive, so none is counted.
   */
  async start(): Promise<void> {
    await this.flush();
    this.cost = emptyCost();
    this.path = new URL(this.page.url()).pathname;
    this.counting = true;
  }

  /**
   * Stops counting and returns the totals. The round trip into the page first lets every report
   * the page sent before it arrive (the protocol keeps messages in order).
   */
  async stop(): Promise<FlowCost> {
    await this.flush();
    this.counting = false;
    return this.snapshot();
  }

  private async flush(): Promise<void> {
    await this.page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 0)));
  }

  snapshot(): FlowCost {
    return { ...this.cost, transitions: this.cost.routeChanges + this.cost.dialogOpens };
  }

  /**
   * A click the harness had to make without the browser seeing it: picking an option from a
   * native `<select>`, whose list Playwright sets directly. Counted, and shown separately.
   */
  addSyntheticClick(): void {
    if (!this.counting) return;
    this.cost.clicks++;
    this.cost.syntheticClicks++;
  }

  private record(event: CounterEvent): void {
    if (event.kind === "hello") {
      // A new document: whatever was showing went with the old one.
      if (this.counting) this.cost.dialogCloses += this.openDialogs;
      this.openDialogs = 0;
      return;
    }
    if (event.kind === "dialogs") {
      if (this.counting) {
        if (event.open > this.openDialogs) this.cost.dialogOpens += event.open - this.openDialogs;
        else this.cost.dialogCloses += this.openDialogs - event.open;
      }
      this.openDialogs = event.open;
      return;
    }
    if (!this.counting) return;
    if (event.kind === "pointer") this.cost.clicks++;
    if (event.kind === "key") {
      this.cost.keystrokes++;
      if (event.key === "Tab") this.cost.tabHops++;
    }
  }
}

export function emptyCost(): FlowCost {
  return {
    clicks: 0,
    keystrokes: 0,
    tabHops: 0,
    routeChanges: 0,
    dialogOpens: 0,
    dialogCloses: 0,
    transitions: 0,
    syntheticClicks: 0,
  };
}
