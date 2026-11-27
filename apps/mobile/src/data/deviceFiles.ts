/**
 * The real files and share sheet behind the export (E12 S9): expo-file-system's legacy calls (its
 * download answers with the status and headers, which the export needs to tell a 401 or a 429
 * from a file) and expo-sharing. Only `src/data` may import either module (biome.json), so no
 * screen can write a file or open a share sheet behind the export's back. Not unit tested: the
 * export's tests drive `exportData.ts` with in-memory stand-ins.
 */

import { requireOptionalNativeModule } from "expo";
import {
  cacheDirectory,
  deleteAsync,
  downloadAsync,
  FileSystemSessionType,
  makeDirectoryAsync,
  moveAsync,
  readAsStringAsync,
} from "expo-file-system/legacy";
import type * as Sharing from "expo-sharing";
import type { ExportFiles, ShareSheet } from "./exportData";

export function createDeviceFiles(): ExportFiles {
  return {
    cacheDirectory,
    makeDirectory: (uri) => makeDirectoryAsync(uri, { intermediates: true }),
    async download(url, to, headers) {
      // Foreground: the person is waiting, and a background session can outlive a sign-out.
      const result = await downloadAsync(url, to, {
        headers,
        sessionType: FileSystemSessionType.FOREGROUND,
      });
      return { status: result.status, headers: result.headers };
    },
    readText: (uri) => readAsStringAsync(uri),
    move: (from, to) => moveAsync({ from, to }),
    remove: (uri) => deleteAsync(uri, { idempotent: true }),
  };
}

/**
 * expo-sharing loads its native module as it is imported, so it is required only once the module is
 * known to be there: a development build from before S9 then says the download failed instead of
 * failing to start.
 */
export function createShareSheet(): ShareSheet {
  if (!requireOptionalNativeModule("ExpoSharing")) {
    return { isAvailable: async () => false, share: async () => {} };
  }
  const sharing: typeof Sharing = require("expo-sharing");
  return {
    isAvailable: () => sharing.isAvailableAsync(),
    share: (uri, options) => sharing.shareAsync(uri, options),
  };
}
