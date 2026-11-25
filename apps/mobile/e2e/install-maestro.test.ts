import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const script = join(__dirname, "install-maestro.sh");

/** Runs the installer against a local zip, so the test never downloads anything. */
function install(zipBytes: Buffer) {
  const dir = mkdtempSync(join(tmpdir(), "maestro-"));
  const zip = join(dir, "maestro.zip");
  writeFileSync(zip, zipBytes);
  return spawnSync("bash", [script, dir, zip], { encoding: "utf8" });
}

describe("install-maestro.sh", () => {
  it("pins a version and a SHA-256 committed in the script, not fetched beside the binary", () => {
    const text = readFileSync(script, "utf8");
    expect(text).toMatch(/^MAESTRO_VERSION="\d+\.\d+\.\d+"$/m);
    expect(text).toMatch(/^MAESTRO_SHA256="[0-9a-f]{64}"$/m);
    expect(text).not.toMatch(/checksums_sha256/);
  });

  it("fails, and unpacks nothing, when the download does not match the checksum", () => {
    const result = install(randomBytes(64));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("does not match the pinned SHA-256");
    expect(result.stdout).not.toContain("Maestro ready");
  });

  it("turns off Maestro's analytics before anything runs", () => {
    const text = readFileSync(script, "utf8");
    expect(text).toMatch(/^export MAESTRO_CLI_NO_ANALYTICS=1$/m);
  });
});
