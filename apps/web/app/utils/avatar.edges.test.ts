import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getUserInitials, processImageFile, resolveUserInitials } from "./avatar";

describe("getUserInitials edge cases", () => {
  it("ignores separators at the start or end of a name", () => {
    expect(getUserInitials("marc_@example.com")).toBe("MA");
    expect(getUserInitials(".ada")).toBe("AD");
  });

  it("is U when the email has nothing before the @", () => {
    expect(getUserInitials("@example.com")).toBe("U");
  });
});

describe("resolveUserInitials skips names that are only spaces", () => {
  const user = { name: "Ada Lovelace", email: "grace.hopper@example.com" };

  it("skips a blank explicit first or last name", () => {
    expect(resolveUserInitials({ firstName: "  ", user })).toBe("AL");
    expect(resolveUserInitials({ lastName: "  ", user })).toBe("AL");
  });

  it("skips a blank first or last name on the user", () => {
    expect(resolveUserInitials({ user: { ...user, firstName: "  " } })).toBe("AL");
    expect(resolveUserInitials({ user: { ...user, lastName: "  " } })).toBe("AL");
  });

  it("skips a blank full name and uses the email", () => {
    expect(resolveUserInitials({ user: { ...user, name: "  " } })).toBe("GH");
  });
});

describe("processImageFile scaling", () => {
  // base64 of the three bytes "abc" is "YWJj", so FileReader gives this data URL.
  const RAW = "data:image/png;base64,YWJj";
  const image = { width: 0, height: 0, fail: false };
  const ctx = { drawImage: vi.fn() };
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn((): typeof ctx | null => ctx),
    toDataURL: vi.fn((type: string, quality: number) => `scaled:${type}:${quality}`),
  };

  class FakeImage {
    width = 0;
    height = 0;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_value: string) {
      queueMicrotask(() => {
        if (image.fail) {
          this.onerror?.();
          return;
        }
        this.width = image.width;
        this.height = image.height;
        this.onload?.();
      });
    }
  }

  beforeEach(() => {
    image.fail = false;
    canvas.width = 0;
    canvas.height = 0;
    canvas.getContext.mockImplementation(() => ctx);
    canvas.toDataURL.mockImplementation((type, quality) => `scaled:${type}:${quality}`);
    ctx.drawImage.mockClear();
    vi.stubGlobal("Image", FakeImage);
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tag: string) =>
      tag === "canvas" ? canvas : realCreate(tag)) as typeof document.createElement);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const png = () => new File(["abc"], "avatar.png", { type: "image/png" });

  it("scales a wide image to the maximum width and keeps PNG", async () => {
    // 1,024 x 512 into 512: height 512 x 512 / 1,024 = 256.
    image.width = 1024;
    image.height = 512;
    await expect(processImageFile(png())).resolves.toBe("scaled:image/png:0.85");
    expect([canvas.width, canvas.height]).toEqual([512, 256]);
    expect(ctx.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 512, 256);
  });

  it("scales a tall image to the maximum height and saves other types as JPEG", async () => {
    // 300 x 1,200 into 512: width 300 x 512 / 1,200 = 128.
    image.width = 300;
    image.height = 1200;
    const file = new File(["abc"], "avatar.webp", { type: "image/webp" });
    await expect(processImageFile(file)).resolves.toBe("scaled:image/jpeg:0.85");
    expect([canvas.width, canvas.height]).toEqual([128, 512]);
  });

  it("leaves a small image at its own size", async () => {
    image.width = 200;
    image.height = 100;
    await processImageFile(png());
    expect([canvas.width, canvas.height]).toEqual([200, 100]);
  });

  it("keeps the raw file when there is no drawing context", async () => {
    image.width = 200;
    image.height = 100;
    canvas.getContext.mockImplementation(() => null);
    await expect(processImageFile(png())).resolves.toBe(RAW);
  });

  it("keeps the raw file when the canvas cannot export", async () => {
    image.width = 200;
    image.height = 100;
    canvas.toDataURL.mockImplementation(() => {
      throw new Error("tainted");
    });
    await expect(processImageFile(png())).resolves.toBe(RAW);
  });

  it("keeps the raw file when the image cannot be decoded", async () => {
    image.fail = true;
    await expect(processImageFile(png())).resolves.toBe(RAW);
  });

  it("keeps the raw file when there is no Image to decode with", async () => {
    vi.stubGlobal("Image", undefined);
    await expect(processImageFile(png())).resolves.toBe(RAW);
  });

  it("accepts a file of exactly 5MB", async () => {
    image.width = 10;
    image.height = 10;
    const file = new File([new Uint8Array(5 * 1024 * 1024)], "five.png", { type: "image/png" });
    await expect(processImageFile(file)).resolves.toBe("scaled:image/png:0.85");
  });

  it("rejects when the file cannot be read", async () => {
    class FailingReader {
      onerror: (() => void) | null = null;
      onload: (() => void) | null = null;
      readAsDataURL() {
        queueMicrotask(() => this.onerror?.());
      }
    }
    vi.stubGlobal("FileReader", FailingReader);
    await expect(processImageFile(png())).rejects.toThrow("Failed to read image file.");
  });
});
