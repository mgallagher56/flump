export function isDemoMode(url: URL | string): boolean {
  try {
    const parsed = typeof url === "string" ? new URL(url, "http://localhost") : url;
    return parsed.searchParams.get("demo") === "true";
  } catch {
    return false;
  }
}
