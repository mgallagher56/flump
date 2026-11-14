import type { FullConfig } from "@playwright/test";
import sharedGlobalSetup from "../support/global-setup";
import { clearFragments } from "./store";

/** Clears the previous run's findings, then signs in and seeds like the other suites. */
export default async function globalSetup(config: FullConfig): Promise<void> {
  clearFragments();
  await sharedGlobalSetup(config);
}
