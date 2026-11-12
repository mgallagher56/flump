# Restore drill log

Append-only. One entry per drill, newest at the bottom. Counts and timings only: **never row data, ids, connection strings or file contents.** Do not edit past entries.

Cadence: before every irreversible migration, monthly for the first 3 months after launch, then quarterly.

## Template (copy below this line, fill in, do not edit the template)

```text
### YYYY-MM-DD HH:MM UTC - <reason, e.g. pre-PR368>
Dump file name:            prod-pre-pr368-<stamp>.dump
Dump size (MB):
Dump age at drill (h):
pg_restore --list TABLE DATA entries (expect 8):
restore_seconds:
Migration seconds (image dry run, if done):
Counts identical to production just before dump (yes/no):
Dry-run cleanup counts equal preview summary (yes/no/not run):
  taxRecords=  accounts=  budgetEntries=  mockIdentityRows=
Rollback rehearsal (old image boots, no schema diff) (pass/fail/not run):
Result (pass/fail):
Notes (no row data):
```

## Entries

<!-- append new entries below -->
