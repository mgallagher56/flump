// Imported first in main.ts. Timestamp columns are `timestamp` without a time zone (audit M5), and
// pg reads and writes them in the Node process's local time, so the process is pinned to UTC
// whatever the host or container sets. The database session is pinned too (typeorm.options.ts).
process.env.TZ = "UTC";

// Imported only for its side effect; the empty export keeps this file a module.
export {};
