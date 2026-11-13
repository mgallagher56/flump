import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "../support/auth";

test.describe("/api proxy", () => {
  test("answers 401 without a session", async ({ request }) => {
    const response = await request.get("/api/accounts", { headers: { "x-flump-request": "1" } });
    expect(response.status()).toBe(401);
  });

  test.describe("when signed in", () => {
    test.use({ storageState: AUTH_STATE });

    test("serves a same-origin request and exposes no access token to page JavaScript", async ({
      page,
    }) => {
      await page.goto("/");
      await expect(page.getByRole("heading", { name: /^Welcome back/ })).toBeVisible();

      const result = await page.evaluate(async () => {
        const response = await fetch("/api/accounts", { headers: { "x-flump-request": "1" } });
        const accounts = (await response.json()) as { name: string }[];
        const globals = (window as unknown as { ENV?: Record<string, unknown> }).ENV ?? {};
        // Anything shaped like a bearer token or a JWT, in `window.ENV` or in rendered DOM text
        // and attribute values. Inline scripts are excluded: the loader-data test covers those.
        const tokenLike = /Bearer\s+\S+|eyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]*/;
        const bodyCopy = document.body.cloneNode(true) as HTMLElement;
        for (const script of bodyCopy.querySelectorAll("script")) script.remove();
        const domValues: string[] = [bodyCopy.textContent ?? ""];
        for (const element of document.querySelectorAll("body *:not(script)")) {
          for (const attribute of Array.from(element.attributes)) domValues.push(attribute.value);
        }
        return {
          status: response.status,
          accountNames: accounts.map((account) => account.name),
          envKeys: Object.keys(globals),
          envHasTokenLike: tokenLike.test(JSON.stringify(globals)),
          domHasTokenLike: domValues.some((value) => tokenLike.test(value)),
        };
      });

      expect(result.status).toBe(200);
      expect(result.accountNames).toEqual(expect.arrayContaining(["E2E Current", "E2E Savings"]));
      expect(result.envKeys.some((key) => /token|secret|authorization/i.test(key))).toBe(false);
      expect(result.envHasTokenLike).toBe(false);
      expect(result.domHasTokenLike).toBe(false);
    });

    // TODO(E20-N8): the root loader still returns `accessToken`, so React Router serialises it
    // into the server-rendered HTML (and so into page JavaScript). The `test.fail` below keeps
    // the suite green today and turns it red when N8 lands, which is the cue to remove
    // `test.fail` and keep the assertion as a permanent guard.
    test("does not serialise an access token into the document", async ({ request }) => {
      test.fail(true, "E20-N8: the root loader still serialises accessToken into the page");
      const response = await request.get("/");
      expect(response.status()).toBe(200);
      expect(await response.text()).not.toContain("accessToken");
    });
  });
});
