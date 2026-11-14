/**
 * Which E16 polish PR owns a source file's copy (docs/design/e16-polish/PLAN.md, section 6).
 * The copy audit (docs/copy/COPY-AUDIT.md) groups its rows by this, so each page session finds
 * its own. First match wins. "shared" means no page PR lists the file: the copy session edits it.
 */

export type CopyOwner =
  | "PR 4"
  | "PR 5"
  | "PR 6"
  | "PR 7"
  | "PR 8"
  | "PR 9"
  | "PR 10"
  | "PR 11"
  | "PR 12"
  | "shared";

const W = "apps/web/app/";
const M = "apps/marketing/src/";

const OWNERS: Array<[RegExp, CopyOwner]> = [
  // PR 4: dashboard and sandbox
  [new RegExp(`^${W}features/dashboard/`), "PR 4"],
  [new RegExp(`^${W}components/dashboard/`), "PR 4"],
  [new RegExp(`^${W}features/snapshot/components/MonthlyCheckInCard/`), "PR 4"],
  [new RegExp(`^${W}routes/(_index|app\\._index|sandbox|app\\.sandbox)\\.tsx$`), "PR 4"],
  [new RegExp(`^${W}features/sandbox/`), "PR 4"],
  [new RegExp(`^${W}features/signed-out/components/(SandboxBar|SampleDataNote)/`), "PR 4"],
  // PR 5: accounts, history, budget
  [new RegExp(`^${W}features/accounts/`), "PR 5"],
  [new RegExp(`^${W}components/accounts/`), "PR 5"],
  [new RegExp(`^${W}containers/accounts/`), "PR 5"],
  [new RegExp(`^${W}routes/app\\.(accounts\\..*|budget)\\.tsx$`), "PR 5"],
  [new RegExp(`^${W}features/snapshot/`), "PR 5"],
  [new RegExp(`^${W}containers/budget/`), "PR 5"],
  [new RegExp(`^${W}features/budget/`), "PR 5"],
  // PR 6: debt and mortgage
  [new RegExp(`^${W}(containers|features|components)/(debt|mortgage|housing)/`), "PR 6"],
  [new RegExp(`^${W}routes/app\\.(debt|mortgage)\\.tsx$`), "PR 6"],
  // PR 7: pension and savings
  [new RegExp(`^${W}(containers|features|components)/(pension|savings|forecast)/`), "PR 7"],
  [new RegExp(`^${W}routes/app\\.(pension|savings|forecast)\\.tsx$`), "PR 7"],
  // PR 8: take-home and self assessment
  [new RegExp(`^${W}(containers|features|components)/(takeHome|take-home|tax)/`), "PR 8"],
  [new RegExp(`^${W}routes/app\\.(take-home|tax\\..*|self-assessment)\\.tsx$`), "PR 8"],
  // PR 11: catalogue and tool pages (before PR 9 and PR 12, which have broader patterns)
  [new RegExp(`^${W}features/signed-out/`), "PR 11"],
  [new RegExp(`^${W}routes/tools\\.`), "PR 11"],
  [new RegExp(`^${W}components/tools/`), "PR 11"],
  [new RegExp(`^${M}pages/(ToolsIndexPage|ToolPage)`), "PR 11"],
  [new RegExp(`^${M}utils/toolSlugs`), "PR 11"],
  // PR 9: settings, onboarding, chrome, loading and error states
  [new RegExp(`^${W}features/(settings|onboarding)/`), "PR 9"],
  [
    new RegExp(
      `^${W}routes/(app\\.profile|app\\.onboarding|\\$|\\$feature\\._index|callback)\\.tsx$`,
    ),
    "PR 9",
  ],
  [new RegExp(`^${W}components/(navigation|structure|dialogs)/`), "PR 9"],
  [new RegExp(`^${W}root\\.tsx$`), "PR 9"],
  // PR 10: calculator bodies
  [/^packages\/ui\/src\/calculators\//, "PR 10"],
  // PR 12: marketing pages
  [new RegExp(`^${M}(pages|components)/`), "PR 12"],
  [new RegExp(`^${M}utils/pricing`), "PR 12"],
];

export const COPY_OWNERS: CopyOwner[] = [
  "PR 4",
  "PR 5",
  "PR 6",
  "PR 7",
  "PR 8",
  "PR 9",
  "PR 10",
  "PR 11",
  "PR 12",
  "shared",
];

export function copyOwner(relPath: string): CopyOwner {
  for (const [pattern, owner] of OWNERS) if (pattern.test(relPath)) return owner;
  return "shared";
}
