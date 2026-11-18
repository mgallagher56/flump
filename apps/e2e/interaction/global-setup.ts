import type { FullConfig } from "@playwright/test";
import sharedGlobalSetup from "../support/global-setup";
import { clearFragments } from "./store";

/** Clears the previous run's results, then signs in and seeds the homeowner like the other suites. */
export default async function globalSetup(config: FullConfig): Promise<void> {
  clearFragments();
  await sharedGlobalSetup(config);
}
