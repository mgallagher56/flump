import {
  asRecord,
  BankMalformedResponseError,
  type ProviderCallContext,
  providerFetchJson,
  type TokenResponse,
} from "@flump/banking/server";

/**
 * Posts an OAuth 2 token request (authorisation-code exchange or refresh) and reads the token
 * answer. Never retried (see providerFetch): a refresh token may rotate on first use.
 */
export async function requestOAuthToken(
  tokenUrl: string,
  form: Record<string, string>,
  ctx: ProviderCallContext,
): Promise<TokenResponse> {
  const data = asRecord(
    await providerFetchJson(
      tokenUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: new URLSearchParams(form).toString(),
      },
      ctx,
    ),
    "body",
    ctx,
  );

  const accessToken = data.access_token ?? data.accessToken;
  if (typeof accessToken !== "string" || accessToken === "") {
    throw new BankMalformedResponseError({ ...ctx, field: "access_token" });
  }
  const refreshToken = data.refresh_token ?? data.refreshToken;
  const expiresIn = data.expires_in ?? data.expiresIn;
  return {
    accessToken,
    refreshToken:
      typeof refreshToken === "string" && refreshToken !== "" ? refreshToken : undefined,
    expiresIn:
      typeof expiresIn === "number" && Number.isFinite(expiresIn)
        ? expiresIn
        : typeof expiresIn === "string" && /^\d+$/.test(expiresIn)
          ? Number(expiresIn)
          : undefined,
  };
}

export function authorizationCodeForm(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  code: string,
): Record<string, string> {
  return {
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  };
}

export function refreshTokenForm(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Record<string, string> {
  return {
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  };
}
