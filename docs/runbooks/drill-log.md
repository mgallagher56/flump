# Restore drill log

Append-only. One entry per drill, newest at the bottom. Counts and timings only: **never row data, ids, connection strings or file contents.** Do not edit past entries.

Cadence: before every irreversible migration, monthly for the first 3 months after launch, then at least every 90 days. The `check:laws` restore-drill law (`scripts/backend-laws/check-restore-drill.ts`) fails CI when the newest entry with `Result (pass/fail): pass` is older than 90 days; keep the heading format exactly (`### YYYY-MM-DD HH:MM UTC - <reason>`). Procedure: `backup-restore.md` section 3.

## Template (copy below this line, fill in, do not edit the template)

```text
### YYYY-MM-DD HH:MM UTC - <reason, e.g. monthly, pre-BE-05, pitr>
Backup name:               flump-prod-<stamp>
Backup age at drill (h):
Encrypted size (MB):
restore_seconds:
tables_checked:
rows_checked:
migrations (backup / restored):
backup-restore.ts RESULT (PASS/FAIL):
verify-restore.sql RESULT (PASS/FAIL):
App /health/ready on restored data (200/not run):
Result (pass/fail):
Notes (no row data):
```

## Entries

<!-- append new entries below -->
