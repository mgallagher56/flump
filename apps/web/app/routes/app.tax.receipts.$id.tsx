import type { LoaderFunctionArgs } from "react-router";
import { backendFetchBytes } from "~/services/backend-client.server";
import { BackendError } from "~/services/backend-error";
import { getAuthSession, requireAccessToken } from "~/utils/auth.server";

// Resource route (no default export): streams one tax receipt through the signed-in session so the
// browser never holds the bytes in loader data or the token. The backend scopes by owner.

const RASTER_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const SERVED_TYPES = new Set([...RASTER_TYPES, "application/pdf"]);

/**
 * RFC 5987 `filename*` value. encodeURIComponent already escapes separators, quotes and control
 * characters; the extra pass covers the few it leaves alone.
 */
const encodeFilename = (name: string): string =>
  encodeURIComponent(name).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );

const hardeningHeaders = {
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "sandbox; default-src 'none'",
  "Cache-Control": "private, no-store",
} as const;

export const loader = async (args: LoaderFunctionArgs) => {
  const { accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  const token = requireAccessToken({ accessToken });
  const id = encodeURIComponent(args.params.id ?? "");

  try {
    const receipt = await backendFetchBytes(`/tax-records/${id}/receipt`, {
      accessToken: token,
      signal: args.request.signal,
    });
    const mime = receipt.contentType.split(";")[0]?.trim().toLowerCase() ?? "";
    const known = SERVED_TYPES.has(mime);
    const disposition = RASTER_TYPES.has(mime) ? "inline" : "attachment";
    const name = encodeFilename(receipt.filename || "receipt");
    return new Response(receipt.body, {
      status: 200,
      headers: {
        ...hardeningHeaders,
        "Content-Type": known ? mime : "application/octet-stream",
        "Content-Disposition": `${known ? disposition : "attachment"}; filename*=UTF-8''${name}`,
        "Content-Length": String(receipt.body.byteLength),
      },
    });
  } catch (error) {
    if (error instanceof BackendError && error.kind === "not-found") {
      return new Response("Not found", { status: 404, headers: hardeningHeaders });
    }
    throw error;
  }
};
