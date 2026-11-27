import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { dark } from "@flump/tokens/native";
import config, { FACE_ID_PERMISSION, ICON_BACKGROUND } from "../app.config";
import { FACE_ID_PERMISSION as COPY_FACE_ID_PERMISSION } from "./copy/accountData";

describe("app.config (E12 S9)", () => {
  it("both plugins that write iOS's Face ID sentence get the one neutral sentence from the copy", () => {
    expect(FACE_ID_PERMISSION).toBe(COPY_FACE_ID_PERMISSION);
    const options = (name: string) =>
      (config.plugins ?? []).find((plugin) => Array.isArray(plugin) && plugin[0] === name)?.[1];
    expect(options("expo-local-authentication")).toEqual({ faceIDPermission: FACE_ID_PERMISSION });
    expect(options("expo-secure-store")).toEqual({
      configureAndroidBackup: true,
      faceIDPermission: FACE_ID_PERMISSION,
    });
  });

  it("the sentence says what Face ID does and claims nothing more", () => {
    expect(FACE_ID_PERMISSION).not.toMatch(/encrypt|protect|secure|account|!/i);
  });
});

describe("app.config icon (logo K2, 27 Nov 2026)", () => {
  /** A PNG's width and height, from its header. */
  const size = (file: string) => {
    const png = readFileSync(resolve(__dirname, "..", file));
    return [png.readUInt32BE(16), png.readUInt32BE(20)];
  };

  it("points at 1024 square PNGs that exist", () => {
    const files = [config.icon, config.android?.adaptiveIcon?.foregroundImage];
    for (const file of files) {
      expect(file).toBeDefined();
      expect(existsSync(resolve(__dirname, "..", file ?? ""))).toBe(true);
      expect(size(file ?? "")).toEqual([1024, 1024]);
    }
  });

  it("sits on the Midnight canvas", () => {
    expect(ICON_BACKGROUND).toBe(dark.colors["surface.canvas"]);
    expect(config.android?.adaptiveIcon?.backgroundColor).toBe(ICON_BACKGROUND);
  });
});
