import type { NextFunction, Request, Response } from "express";

/**
 * True for any request path that names a source map (`*.map`, any case, percent-encoded or not).
 * An undecodable path is treated as a map request too: it is refused rather than passed on.
 */
export function isSourceMapPath(urlPath: string): boolean {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return true;
  }
  return /\.map\/*$/i.test(decoded);
}

/**
 * Source maps are never served (BE-07, audit L14). The client build only emits hidden maps when
 * they are uploaded to Sentry, and the upload deletes them, so none should exist in `build/`; this
 * is the backstop if one is left behind. Mounted before every static handler, it answers a plain
 * 404 for any `*.map` path so the original source can never be fetched from the web server.
 */
export function noSourceMaps() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!isSourceMapPath(req.path)) {
      next();
      return;
    }
    res.status(404).type("text/plain").send("Not Found");
  };
}
