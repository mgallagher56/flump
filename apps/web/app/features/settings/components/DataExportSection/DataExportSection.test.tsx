import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountExportError, downloadAccountExport } from "~/features/settings/accountExport";
import { DataExportSection } from "./DataExportSection";

describe("<DataExportSection />", () => {
  it("shows a pending state, then confirms the download started", async () => {
    let finish: () => void = () => {};
    const download = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    render(<DataExportSection download={download} />);

    fireEvent.click(screen.getByRole("button", { name: "Download your data" }));
    const pending = screen.getByRole("button", { name: "Preparing your file" });
    expect(pending.getAttribute("aria-busy")).toBe("true");
    fireEvent.click(pending);
    expect(download).toHaveBeenCalledTimes(1);

    finish();
    expect(await screen.findByText("Your download has started.")).toBeDefined();
  });

  it("announces a failure", async () => {
    const download = vi.fn().mockRejectedValue(new AccountExportError("failed"));
    render(<DataExportSection download={download} />);
    fireEvent.click(screen.getByRole("button", { name: "Download your data" }));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "We could not prepare your download. Try again.",
    );
  });

  it("explains a rate limit", async () => {
    const download = vi.fn().mockRejectedValue(new AccountExportError("rate_limited"));
    render(<DataExportSection download={download} />);
    fireEvent.click(screen.getByRole("button", { name: "Download your data" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Wait a little");
  });
});

describe("downloadAccountExport", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("fetches the export route with the same-origin header and saves the file", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('{"a":1}', {
        status: 200,
        headers: { "Content-Disposition": 'attachment; filename="flump-export-2026-11-14.json"' },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const createObjectURL = vi.fn(() => "blob:export");
    const original = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = vi.fn();
    const clicked: HTMLAnchorElement[] = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this);
    });

    await downloadAccountExport();

    expect(fetchMock).toHaveBeenCalledWith(
      "/account/export",
      expect.objectContaining({
        cache: "no-store",
        credentials: "same-origin",
        headers: { "X-Flump-Request": "1" },
      }),
    );
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clicked[0]?.download).toBe("flump-export-2026-11-14.json");
    expect(clicked[0]?.href).toBe("blob:export");
    expect(document.querySelector("a[download]")).toBeNull();
    click.mockRestore();
    URL.createObjectURL = original.create;
    URL.revokeObjectURL = original.revoke;
  });

  it("throws a rate-limited error on 429 and a generic one otherwise", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 429 })));
    await expect(downloadAccountExport()).rejects.toMatchObject({ reason: "rate_limited" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 502 })));
    await expect(downloadAccountExport()).rejects.toMatchObject({ reason: "failed" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(downloadAccountExport()).rejects.toMatchObject({ reason: "failed" });
  });
});
