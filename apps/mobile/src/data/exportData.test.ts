import {
  createExportData,
  EXPORT_FOLDER,
  type ExportFiles,
  type ShareSheet,
  sweepExports,
} from "./exportData";

const CACHE = "file:///data/app/cache/";
const FOLDER = `${CACHE}${EXPORT_FOLDER}/`;
const API = "https://api.test.invalid";

interface Answer {
  status: number;
  headers?: Record<string, string>;
  /** The body written to the file; empty when left out. */
  body?: string;
  /** Runs while the download is in flight (a sign-out, say). */
  during?: () => void;
}

/** An in-memory cache folder: every path written, moved and removed is recorded. */
function memoryFiles(answers: (Answer | Error)[]) {
  const files = new Set<string>();
  const bodies = new Map<string, string>();
  const downloads: { url: string; to: string; headers: Record<string, string> }[] = [];
  const fs: ExportFiles & { files: Set<string>; downloads: typeof downloads } = {
    cacheDirectory: CACHE,
    makeDirectory: jest.fn(async () => {}),
    download: jest.fn(async (url: string, to: string, headers: Record<string, string>) => {
      downloads.push({ url, to, headers });
      const answer = answers.shift() ?? { status: 500 };
      if (answer instanceof Error) throw answer;
      answer.during?.();
      // As expo-file-system's legacy download: the body is written whatever the status.
      files.add(to);
      bodies.set(to, answer.body ?? "");
      return { status: answer.status, headers: answer.headers ?? {} };
    }),
    readText: jest.fn(async (uri: string) => {
      if (!files.has(uri)) throw new Error("no such file");
      return bodies.get(uri) ?? "";
    }),
    move: jest.fn(async (from: string, to: string) => {
      files.delete(from);
      files.add(to);
    }),
    remove: jest.fn(async (uri: string) => {
      for (const file of [...files]) if (file === uri || file.startsWith(uri)) files.delete(file);
    }),
    files,
    downloads,
  };
  return fs;
}

function shareSheet(over: Partial<ShareSheet> = {}) {
  const seen: { uri: string; filesAtShare: string[] }[] = [];
  return {
    seen,
    sheet: {
      isAvailable: jest.fn(async () => true),
      share: jest.fn(async (uri: string) => {
        seen.push({ uri, filesAtShare: [] });
      }),
      ...over,
    } satisfies ShareSheet,
  };
}

const ATTACHMENT = { "Content-Disposition": 'attachment; filename="flump-export-2026-11-27.json"' };

function setUp(
  answers: (Answer | Error)[],
  over: { refresh?: string; token?: string | null } = {},
) {
  const fs = memoryFiles(answers);
  const share = shareSheet();
  let token: string | null = over.token === undefined ? "access_1" : over.token;
  const setToken = (next: string | null) => {
    token = next;
  };
  const session = {
    getAccessToken: jest.fn(() => token),
    refresh: jest.fn(async () => {
      if ((over.refresh ?? "refreshed") === "refreshed") token = "access_2";
      return (over.refresh ?? "refreshed") as "refreshed" | "ended" | "retryable";
    }),
  };
  const run = createExportData({
    apiBaseUrl: API,
    session,
    files: fs,
    share: share.sheet,
    clientHeader: "mobile/1.0.0 (ios)",
  });
  return { fs, share, session, run, setToken };
}

const GONE = JSON.stringify({ code: "account_deleted", message: "This account was deleted." });

describe("exportData", () => {
  it("downloads with the bearer token into the cache folder, shares the server's file name, then deletes it", async () => {
    const { fs, share, run } = setUp([{ status: 200, headers: ATTACHMENT }]);
    (share.sheet.share as jest.Mock).mockImplementation(async (uri: string) => {
      // While the sheet is open the file is there, under the server's name, in the cache folder.
      expect([...fs.files]).toEqual([`${FOLDER}flump-export-2026-11-27.json`]);
      expect(uri).toBe(`${FOLDER}flump-export-2026-11-27.json`);
    });

    expect(await run()).toBe("shared");
    expect(fs.downloads).toHaveLength(1);
    expect(fs.downloads[0]?.url).toBe(`${API}/v1/user-profile/export`);
    expect(fs.downloads[0]?.headers).toEqual({
      Authorization: "Bearer access_1",
      "X-Flump-Client": "mobile/1.0.0 (ios)",
    });
    expect(fs.downloads[0]?.to.startsWith(FOLDER)).toBe(true);
    expect(share.sheet.share).toHaveBeenCalledWith(`${FOLDER}flump-export-2026-11-27.json`, {
      mimeType: "application/json",
      UTI: "public.json",
    });
    // Gone once the sheet closed, whether or not it was shared.
    expect([...fs.files]).toEqual([]);
  });

  it("reads the header in any case, and falls back to a plain name for an odd one", async () => {
    const lower = setUp([
      {
        status: 200,
        headers: { "content-disposition": 'attachment; filename="flump-export-2026-01-02.json"' },
      },
    ]);
    await lower.run();
    expect(lower.share.sheet.share).toHaveBeenCalledWith(
      `${FOLDER}flump-export-2026-01-02.json`,
      expect.anything(),
    );
    // A name with a path in it is never used.
    const odd = setUp([
      {
        status: 200,
        headers: { "Content-Disposition": 'attachment; filename="../../evil.json"' },
      },
    ]);
    await odd.run();
    expect(odd.share.sheet.share).toHaveBeenCalledWith(
      `${FOLDER}flump-export.json`,
      expect.anything(),
    );
    const none = setUp([{ status: 200 }]);
    await none.run();
    expect(none.share.sheet.share).toHaveBeenCalledWith(
      `${FOLDER}flump-export.json`,
      expect.anything(),
    );
  });

  it("deletes the file when the share sheet fails too", async () => {
    const { fs, share, run } = setUp([{ status: 200, headers: ATTACHMENT }]);
    (share.sheet.share as jest.Mock).mockRejectedValueOnce(new Error("no activity"));
    expect(await run()).toBe("failed");
    expect([...fs.files]).toEqual([]);
  });

  it("with no share sheet on this phone: failed, and nothing kept", async () => {
    const { fs, share, run } = setUp([{ status: 200, headers: ATTACHMENT }]);
    (share.sheet.isAvailable as jest.Mock).mockResolvedValueOnce(false);
    expect(await run()).toBe("failed");
    expect(share.sheet.share).not.toHaveBeenCalled();
    expect([...fs.files]).toEqual([]);
  });

  it("a 401 runs the session's one shared refresh and tries once more with the new token", async () => {
    const { fs, session, run } = setUp([{ status: 401 }, { status: 200, headers: ATTACHMENT }]);
    expect(await run()).toBe("shared");
    expect(session.refresh).toHaveBeenCalledTimes(1);
    expect(fs.downloads.map((d) => d.headers.Authorization)).toEqual([
      "Bearer access_1",
      "Bearer access_2",
    ]);
    expect([...fs.files]).toEqual([]);
  });

  it("a second 401 is failed, with no second refresh", async () => {
    const { fs, session, run } = setUp([{ status: 401 }, { status: 401 }]);
    expect(await run()).toBe("failed");
    expect(session.refresh).toHaveBeenCalledTimes(1);
    expect(fs.downloads).toHaveLength(2);
    expect([...fs.files]).toEqual([]);
  });

  it("a refresh that ends the session is ended; one that cannot reach WorkOS is failed", async () => {
    const ended = setUp([{ status: 401 }], { refresh: "ended" });
    expect(await ended.run()).toBe("ended");
    expect(ended.fs.downloads).toHaveLength(1);
    const retryable = setUp([{ status: 401 }], { refresh: "retryable" });
    expect(await retryable.run()).toBe("failed");
    expect(retryable.fs.downloads).toHaveLength(1);
  });

  it.each([
    ["account_deleted", GONE, "accountDeleted"],
    ["another code", JSON.stringify({ code: "gone" }), "failed"],
    ["no code", JSON.stringify({ message: "Gone" }), "failed"],
    ["a body that is not JSON", "<html>Gone</html>", "failed"],
    ["an empty body", "", "failed"],
  ] as const)(
    "a 410 with %s (%s) is %s, and the body written is deleted",
    async (_name, body, outcome) => {
      const { fs, share, run } = setUp([{ status: 410, body }]);
      expect(await run()).toBe(outcome);
      expect(share.sheet.share).not.toHaveBeenCalled();
      expect([...fs.files]).toEqual([]);
    },
  );

  it("a sign-out while the file downloads: ended, the file deleted and no share sheet", async () => {
    const answers: Answer[] = [{ status: 200, headers: ATTACHMENT }];
    const { fs, share, run, setToken } = setUp(answers);
    answers[0] = { ...answers[0], status: 200, during: () => setToken(null) };
    expect(await run()).toBe("ended");
    expect(share.sheet.share).not.toHaveBeenCalled();
    expect(fs.move).not.toHaveBeenCalled();
    expect([...fs.files]).toEqual([]);
  });

  it("a different session by the time the file is in: failed, the file deleted and no share sheet", async () => {
    const answers: Answer[] = [{ status: 200, headers: ATTACHMENT }];
    const { fs, share, run, setToken } = setUp(answers);
    answers[0] = { ...answers[0], status: 200, during: () => setToken("access_other") };
    expect(await run()).toBe("failed");
    expect(share.sheet.share).not.toHaveBeenCalled();
    expect([...fs.files]).toEqual([]);
  });

  it.each([
    [429, "rateLimited"],
    [503, "failed"],
    [500, "failed"],
    [403, "failed"],
    [404, "failed"],
  ] as const)("a %i is %s, and the body written is deleted", async (status, outcome) => {
    const { fs, share, run } = setUp([{ status }]);
    expect(await run()).toBe(outcome);
    expect(share.sheet.share).not.toHaveBeenCalled();
    expect([...fs.files]).toEqual([]);
  });

  it("a 2xx other than 200 still shares (206 is not expected, but a body came)", async () => {
    const { run } = setUp([{ status: 299, headers: ATTACHMENT }]);
    expect(await run()).toBe("shared");
  });

  it("a download that throws (no network, a full disk) is failed", async () => {
    const { fs, run } = setUp([new Error("offline")]);
    expect(await run()).toBe("failed");
    expect([...fs.files]).toEqual([]);
  });

  it("with no token in memory, nothing is sent", async () => {
    const { fs, run } = setUp([], { token: null });
    expect(await run()).toBe("failed");
    expect(fs.downloads).toHaveLength(0);
  });

  it("with no cache folder (it never happens on a phone), nothing is sent", async () => {
    const { fs, run } = setUp([{ status: 200 }]);
    fs.cacheDirectory = null;
    expect(await run()).toBe("failed");
    expect(fs.downloads).toHaveLength(0);
  });
});

describe("sweepExports", () => {
  it("removes the whole export folder in the cache, and nothing else", async () => {
    const fs = memoryFiles([]);
    fs.files.add(`${FOLDER}flump-export-2026-11-27.json`);
    fs.files.add(`${FOLDER}download-1.json`);
    fs.files.add(`${CACHE}other-app-cache.bin`);
    await sweepExports(fs);
    expect([...fs.files]).toEqual([`${CACHE}other-app-cache.bin`]);
    expect(fs.remove).toHaveBeenCalledWith(FOLDER);
  });

  it("never throws", async () => {
    const fs = memoryFiles([]);
    (fs.remove as jest.Mock).mockRejectedValueOnce(new Error("busy"));
    await expect(sweepExports(fs)).resolves.toBeUndefined();
  });
});
