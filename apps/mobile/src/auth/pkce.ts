/**
 * PKCE (RFC 7636, S256) and the sign-in `state` (plan section 5.2). The crypto is injected so the
 * tests use Node's and the app uses expo-crypto's (`authDeps.ts`). The verifier and state live in
 * memory for one sign-in only and are never stored or logged.
 */
export interface PkceCrypto {
  randomBytes(count: number): Uint8Array;
  sha256(text: string): Promise<Uint8Array>;
}

export interface Pkce {
  readonly verifier: string;
  readonly challenge: string;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** Unpadded base64url (RFC 4648 section 5). Written out because Hermes has no Buffer. */
export function base64Url(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0;
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    const triple = (a << 16) | (b << 8) | c;
    out += ALPHABET[(triple >> 18) & 63];
    out += ALPHABET[(triple >> 12) & 63];
    if (i + 1 < bytes.length) out += ALPHABET[(triple >> 6) & 63];
    if (i + 2 < bytes.length) out += ALPHABET[triple & 63];
  }
  return out;
}

function random(crypto: PkceCrypto, count: number): Uint8Array {
  const bytes = crypto.randomBytes(count);
  if (bytes.length !== count) throw new Error("The random source returned the wrong length.");
  return bytes;
}

/** A 43-character verifier from 32 random bytes, and its S256 challenge. */
export async function createPkce(crypto: PkceCrypto): Promise<Pkce> {
  const verifier = base64Url(random(crypto, 32));
  const challenge = base64Url(await crypto.sha256(verifier));
  return { verifier, challenge };
}

/** A 22-character state from 16 random bytes, checked on the way back before any exchange. */
export function createState(crypto: PkceCrypto): string {
  return base64Url(random(crypto, 16));
}
