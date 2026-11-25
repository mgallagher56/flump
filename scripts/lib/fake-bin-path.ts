/**
 * A test PATH that puts a fake tool directory in front of real directories: the real PATH, or
 * system directories such as /usr/bin. A real tool there answers whenever the fake is missing or
 * removed (e59a4b811: the "docker missing" case found the runner's /usr/bin/docker).
 */
const FAKE_THEN_REAL =
  /PATH:\s*`[^`]*\$\{[^}]+\}:(?:\$\{process\.env\.PATH|\/usr\/|\/bin\b|\/opt\/|\/sbin\b)/g;

export function findFakeThenRealPaths(source: string): number[] {
  return [...source.matchAll(FAKE_THEN_REAL)].map(
    (m) => source.slice(0, m.index).split("\n").length,
  );
}

export function isTestFile(file: string): boolean {
  return /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file);
}
