/**
 * Reads an access token's claims without checking its signature. Used only for the session id
 * that sign-out sends to WorkOS and for the dev-only sign-in check; the backend verifies every
 * token. Never returns or logs the token itself.
 */
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function decodeBase64Url(text: string): string | undefined {
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of text) {
    const index = ALPHABET.indexOf(char);
    if (index === -1) return undefined;
    value = (value << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >> bits) & 0xff);
    }
  }
  try {
    // Percent-encode each byte so decodeURIComponent reads the UTF-8.
    return decodeURIComponent(bytes.map((b) => `%${b.toString(16).padStart(2, "0")}`).join(""));
  } catch {
    return undefined;
  }
}

export function readClaims(accessToken: string): Record<string, unknown> | undefined {
  const parts = accessToken.split(".");
  if (parts.length !== 3 || !parts[1]) return undefined;
  const json = decodeBase64Url(parts[1]);
  if (json === undefined) return undefined;
  try {
    const parsed: unknown = JSON.parse(json);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

/** The WorkOS session id (`sid`), or undefined. */
export function readSessionId(accessToken: string | null): string | undefined {
  if (!accessToken) return undefined;
  const sid = readClaims(accessToken)?.sid;
  return typeof sid === "string" && sid.length > 0 ? sid : undefined;
}
