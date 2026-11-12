import { authLoader, configure } from "@workos-inc/authkit-react-router";
import type { LoaderFunctionArgs } from "react-router";
import { redirect, useLoaderData } from "react-router";

const workosLoader = authLoader({
  returnPathname: "/app",
});

export const loader = async (args: LoaderFunctionArgs) => {
  const request = args.request;
  const url = new URL(request.url);
  if (!url.searchParams.get("code")) {
    return redirect("/login");
  }

  if (
    process.env.NODE_ENV === "development" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1")
  ) {
    configure((key: string) => {
      if (key === "WORKOS_REDIRECT_URI") {
        return `${url.origin}/callback`;
      }
      return process.env[key];
    });
  }

  const response = await workosLoader(args);
  const behindHttpsProxy =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase() === "https";
  const secure = url.protocol === "https:" || behindHttpsProxy ? "; Secure" : "";
  const sessionPresenceCookie = `flump_has_session=1; Path=/; SameSite=Lax; Max-Age=2592000${secure}`;

  if (response instanceof Response) {
    const headers = new Headers(response.headers);
    headers.append("Set-Cookie", sessionPresenceCookie);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  return response;
};

export default function CallbackRoute() {
  const data = useLoaderData<typeof loader>() as any;
  if (data?.error) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "12px" }}>
          Authentication Could Not Be Completed
        </h2>
        <p style={{ color: "var(--colors-text-muted)", maxWidth: "480px", margin: "0 auto 24px" }}>
          {data.error.description ||
            data.error.message ||
            "An authentication error occurred while validating your session."}
        </p>
        <a
          href="/login"
          style={{
            display: "inline-block",
            padding: "12px 24px",
            backgroundColor: "var(--colors-primary-solid)",
            color: "var(--colors-primary-foreground)",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Return to Log In
        </a>
      </div>
    );
  }
  return null;
}
