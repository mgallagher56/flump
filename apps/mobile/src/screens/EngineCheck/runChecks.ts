import { runEngineCheck } from "@flump/finance-engine/engine-check";
import { FORMAT_FIXTURES, runFormatCase } from "@flump/format/fixtures";
import { loadConfig, MobileConfigError } from "../../config";

interface FormatMismatch {
  readonly call: string;
  readonly expected: string;
  readonly actual: string;
}

export interface CheckReport {
  readonly jsEngine: "Hermes" | "Not Hermes";
  readonly vectors: { readonly checked: number; readonly failedIds: readonly string[] };
  readonly formatting: { readonly checked: number; readonly mismatches: readonly FormatMismatch[] };
  readonly apiAddress: string;
}

/**
 * Everything the engine check screen shows. The engine and the formatter do the work; this only
 * collects their results so the screen can say whether this JavaScript engine agrees with V8.
 */
export function runChecks(): CheckReport {
  const vectors = runEngineCheck();
  const mismatches = FORMAT_FIXTURES.flatMap((c) => {
    const actual = runFormatCase(c);
    return actual === c.expected
      ? []
      : [{ call: `${c.fn}(${JSON.stringify(c.args)})`, expected: c.expected, actual }];
  });

  let apiAddress: string;
  try {
    apiAddress = loadConfig().apiBaseUrl;
  } catch (error) {
    if (!(error instanceof MobileConfigError)) throw error;
    apiAddress = `Not set (${error.message})`;
  }

  return {
    jsEngine: "HermesInternal" in globalThis ? "Hermes" : "Not Hermes",
    vectors: { checked: vectors.checked, failedIds: vectors.failures.map((f) => f.id) },
    formatting: { checked: FORMAT_FIXTURES.length, mismatches },
    apiAddress,
  };
}
