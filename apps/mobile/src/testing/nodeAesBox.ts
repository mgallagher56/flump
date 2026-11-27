/**
 * Tests only: AES-256-GCM from Node standing in for expo-crypto's native AES, laid out as the app
 * uses it (12 byte IV, ciphertext, 16 byte tag, base64), with the tag length fixed both ways so a
 * shorter tag is refused, as GCM requires. Nothing in the app imports it.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { SealingBox } from "../data/cacheStore";

const IV_BYTES = 12;
const TAG_BYTES = 16;

export const nodeAesBox: SealingBox = {
  generateKey: async () => randomBytes(32).toString("base64"),
  async seal(key, plaintext, associated) {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "base64"), iv, {
      authTagLength: TAG_BYTES,
    });
    cipher.setAAD(associated);
    const body = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return Buffer.concat([iv, body, cipher.getAuthTag()]).toString("base64");
  },
  async open(key, sealed, associated) {
    const all = Buffer.from(sealed, "base64");
    if (all.length < IV_BYTES + TAG_BYTES) throw new Error("Too short");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      Buffer.from(key, "base64"),
      all.subarray(0, IV_BYTES),
      { authTagLength: TAG_BYTES },
    );
    decipher.setAAD(associated);
    decipher.setAuthTag(all.subarray(all.length - TAG_BYTES));
    return new Uint8Array(
      Buffer.concat([
        decipher.update(all.subarray(IV_BYTES, all.length - TAG_BYTES)),
        decipher.final(),
      ]),
    );
  },
};
