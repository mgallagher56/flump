import config, { FACE_ID_PERMISSION } from "../app.config";
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
