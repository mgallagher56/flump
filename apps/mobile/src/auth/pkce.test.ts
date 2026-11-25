import { createHash, randomBytes } from "node:crypto";
import { base64Url, createPkce, createState, type PkceCrypto } from "./pkce";

const nodeCrypto: PkceCrypto = {
  randomBytes: (n) => new Uint8Array(randomBytes(n)),
  sha256: async (text) => new Uint8Array(createHash("sha256").update(text, "ascii").digest()),
};

describe("pkce", () => {
  it("encodes bytes as unpadded base64url", () => {
    // 0xfb 0xff 0xfe in base64 is "+//+": base64url swaps + and / for - and _.
    expect(base64Url(new Uint8Array([0xfb, 0xff, 0xfe]))).toBe("-__-");
    // Two bytes leave one padding character in base64 ("AAE="), which base64url drops.
    expect(base64Url(new Uint8Array([0x00, 0x01]))).toBe("AAE");
  });

  it("matches the RFC 7636 appendix B example", async () => {
    // The RFC's 32 octets give this verifier, and its S256 challenge is E9Melhoa...
    const octets = [
      116, 24, 223, 180, 151, 153, 224, 37, 79, 250, 96, 125, 216, 173, 187, 186, 22, 212, 37, 77,
      105, 214, 191, 240, 91, 88, 5, 88, 83, 132, 141, 121,
    ];
    const pkce = await createPkce({ ...nodeCrypto, randomBytes: () => new Uint8Array(octets) });
    expect(pkce.verifier).toBe("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk");
    expect(pkce.challenge).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });

  it("asks for 32 random bytes for the verifier and 16 for the state", async () => {
    const asked: number[] = [];
    const counting: PkceCrypto = {
      ...nodeCrypto,
      randomBytes: (n) => {
        asked.push(n);
        return nodeCrypto.randomBytes(n);
      },
    };
    const pkce = await createPkce(counting);
    const state = createState(counting);
    expect(asked).toEqual([32, 16]);
    expect(pkce.verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(state).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  it("refuses a random source that returns too few bytes", async () => {
    await expect(
      createPkce({ ...nodeCrypto, randomBytes: () => new Uint8Array(8) }),
    ).rejects.toThrow("random");
  });
});
