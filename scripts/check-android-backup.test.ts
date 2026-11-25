import { describe, expect, test } from "bun:test";
import { checkBackup } from "./check-android-backup";

const manifest = (attrs: string) =>
  `<manifest><application android:name=".MainApplication" ${attrs}><activity/></application></manifest>`;
const both = 'android:fullBackupContent="@xml/backup" android:dataExtractionRules="@xml/extract"';
const fullRules = `<full-backup-content><include domain="sharedpref" path="."/><exclude domain="sharedpref" path="SecureStore"/></full-backup-content>`;
const extractRules = (transferExcludes = true) =>
  `<data-extraction-rules><cloud-backup><include domain="sharedpref" path="."/><exclude domain="sharedpref" path="SecureStore"/></cloud-backup><device-transfer><include domain="sharedpref" path="."/>${transferExcludes ? '<exclude domain="sharedpref" path="SecureStore"/>' : ""}</device-transfer></data-extraction-rules>`;
const rules =
  (extract = extractRules()) =>
  (name: string) =>
    ({ backup: fullRules, extract })[name];

describe("check-android-backup", () => {
  test("passes when both rule files exclude the secure store everywhere", () => {
    expect(checkBackup(manifest(both), rules())).toEqual([]);
  });

  test("passes when backup is off", () => {
    expect(checkBackup(manifest('android:allowBackup="false"'), () => undefined)).toEqual([]);
  });

  test("fails when the manifest names no rules (backup copies everything)", () => {
    expect(
      checkBackup(manifest('android:allowBackup="true"'), rules()).map((f) => f.problem),
    ).toEqual([
      "the manifest has no android:fullBackupContent, so backup copies everything",
      "the manifest has no android:dataExtractionRules, so backup copies everything",
    ]);
  });

  test("fails when device transfer would carry the secure store", () => {
    expect(checkBackup(manifest(both), rules(extractRules(false))).map((f) => f.problem)).toEqual([
      "extract.xml: <device-transfer> does not exclude the SecureStore shared preferences",
    ]);
  });

  test("fails when a section is missing or a file cannot be found", () => {
    const noTransfer = extractRules().replace(/<device-transfer>[\s\S]*<\/device-transfer>/, "");
    expect(checkBackup(manifest(both), rules(noTransfer)).map((f) => f.problem)).toEqual([
      "extract.xml: <device-transfer> is missing, so its default backs up everything",
    ]);
    expect(checkBackup(manifest(both), () => undefined).map((f) => f.problem)).toEqual([
      "backup.xml was not found",
      "extract.xml was not found",
    ]);
  });
});
