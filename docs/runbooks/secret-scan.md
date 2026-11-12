# Secret scan (gitleaks)

CI job `secret-scan` in `.github/workflows/security-scan.yml` scans the commit range of every PR and every push to `main` with gitleaks. It is advisory (no required checks), but Railway Wait-for-CI means a red push to `main` skips the deploy. There is no schedule trigger today; the `if` guard is kept for appended jobs.

If `main` was force-pushed, the push event's `BEFORE` commit may be unreachable and the job then errors (not a leak finding). Re-run after fixing, or scan locally.

- Config: `.gitleaks.toml` (upstream defaults plus a small allowlist).
- Accepted findings: `.gitleaksignore` (fingerprints, empty today).
- The image is pinned by tag and digest in the workflow. To bump it, run `docker buildx imagetools inspect zricethezav/gitleaks:<tag>` and copy the top-level `Digest`.

## Scan the full history locally

```sh
docker run --rm -v "$PWD:/repo" \
  zricethezav/gitleaks:v8.30.1@sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f \
  git /repo --config /repo/.gitleaks.toml --redact --exit-code 1
```

Add `--log-opts="origin/main..HEAD"` to scan only your branch.

## Triage a finding

1. Treat it as real until proven otherwise. If it is a live credential, rotate it first, then continue.
2. Removing it from the latest commit does not remove it from history. Rotation is the fix.
3. After rotating, or if it is a confirmed false positive, copy the `Fingerprint` from the report into `.gitleaksignore` with a short comment on the line above.
4. For a whole class of false positives (a fixtures directory), add a path or regex allowlist to `.gitleaks.toml` instead.
5. In tests, build token-like fixtures at runtime (`"sk_" + "test_" + "x".repeat(24)`) so no literal secret is committed.
