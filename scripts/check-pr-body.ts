/**
 * Checks a pull request description against the laws (scripts/lib/pr-body.ts).
 *
 *   In CI:   bun scripts/check-pr-body.ts --event "$GITHUB_EVENT_PATH"   reads the pull_request event
 *   Locally: gh pr view <n> --json title,body,author,headRefName | bun scripts/check-pr-body.ts -
 *
 * The body is read from a file or stdin, never from the command line or a workflow expression, so
 * no description text reaches a shell.
 */
import { readFileSync } from "node:fs";
import { checkPrBody, type PrBodyInput } from "./lib/pr-body";

function readInput(): PrBodyInput {
  if (process.argv[2] === "-") {
    const view = JSON.parse(readFileSync(0, "utf8")) as {
      title?: string;
      body?: string;
      author?: { login?: string } | string;
      headRefName?: string;
    };
    const author = typeof view.author === "string" ? view.author : view.author?.login;
    return { title: view.title ?? "", body: view.body ?? "", author, headRef: view.headRefName };
  }
  const eventPath = process.argv[2] === "--event" ? process.argv[3] : undefined;
  if (!eventPath) {
    console.error(
      "No input. Run: gh pr view <n> --json title,body,author,headRefName | bun scripts/check-pr-body.ts -",
    );
    process.exit(2);
  }
  const event = JSON.parse(readFileSync(eventPath, "utf8")) as {
    pull_request?: {
      title?: string;
      body?: string | null;
      user?: { login?: string };
      head?: { ref?: string };
    };
  };
  const pr = event.pull_request;
  if (!pr) {
    console.error(`${eventPath} holds no pull_request event.`);
    process.exit(2);
  }
  return {
    title: pr.title ?? "",
    body: pr.body ?? "",
    author: pr.user?.login,
    headRef: pr.head?.ref,
  };
}

const errors = checkPrBody(readInput());
if (errors.length) {
  console.error(`PR description check failed:\n${errors.map((e) => `- ${e}`).join("\n")}`);
  console.error(
    "Edit the description (gh pr edit <n> --body-file <file>); this check re-runs on edit.",
  );
  process.exit(1);
}
console.log("PR description check passed.");
