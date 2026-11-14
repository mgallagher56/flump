import "reflect-metadata";
import { allRoutes, findRoute, successStatusOf } from "@flump/api-contract";
import { RequestMethod } from "@nestjs/common";
import { HTTP_CODE_METADATA, METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";
import { AppModule } from "../../src/app.module";
import { moduleControllers } from "../../src/testing/module-controllers";

/**
 * Success status codes (BE-09, audit M-API5): every controller route declares `@HttpCode`, and it
 * equals the manifest's `status` (default 200), so the OpenAPI document tells the truth. Without
 * `@HttpCode` Nest answers a POST with 201, which is wrong for actions.
 */
const VERBS: Record<number, string> = {
  [RequestMethod.GET]: "GET",
  [RequestMethod.POST]: "POST",
  [RequestMethod.PATCH]: "PATCH",
  [RequestMethod.PUT]: "PUT",
  [RequestMethod.DELETE]: "DELETE",
};

const clean = (value: string) => value.replace(/^\/+|\/+$/g, "");

interface Handler {
  label: string;
  method: string;
  path: string;
  httpCode: number | undefined;
}

function handlers(): Handler[] {
  const controllers = moduleControllers(AppModule);
  const out: Handler[] = [];
  for (const controller of controllers) {
    const prefix = (Reflect.getMetadata(PATH_METADATA, controller) as string | undefined) ?? "/";
    for (const name of Object.getOwnPropertyNames(controller.prototype)) {
      const handler = (controller.prototype as Record<string, unknown>)[name];
      if (typeof handler !== "function") continue;
      const verb = Reflect.getMetadata(METHOD_METADATA, handler) as number | undefined;
      if (verb === undefined || !VERBS[verb]) continue;
      const sub = (Reflect.getMetadata(PATH_METADATA, handler) as string | undefined) ?? "/";
      out.push({
        label: `${controller.name}.${name}`,
        method: VERBS[verb],
        path: [clean(prefix), clean(sub)].filter(Boolean).join("/"),
        httpCode: Reflect.getMetadata(HTTP_CODE_METADATA, handler) as number | undefined,
      });
    }
  }
  return out;
}

describe("HTTP success status", () => {
  it("reads Nest's own metadata key", () => {
    expect(HTTP_CODE_METADATA).toBe("__httpCode__");
  });

  it("every route declares @HttpCode equal to the manifest status", () => {
    const found = handlers();
    expect(found).toHaveLength(allRoutes.length);
    const mismatches = found.flatMap((h) => {
      const route = findRoute(h.method, h.path);
      if (!route) return [`${h.label}: ${h.method} ${h.path} is not in the manifest`];
      const expected = successStatusOf(route);
      if (h.httpCode === undefined) return [`${h.label}: no @HttpCode (manifest says ${expected})`];
      return h.httpCode === expected
        ? []
        : [`${h.label}: @HttpCode(${h.httpCode}) but the manifest says ${expected}`];
    });
    expect(mismatches).toEqual([]);
  });

  it("creates are 201 and nothing else is", () => {
    const creates = allRoutes.filter((r) => successStatusOf(r) === 201).map((r) => r.id);
    expect(creates.sort()).toEqual(
      [
        "accounts.create",
        "bankConnections.connect",
        "budget.addCategory",
        "budget.create",
        "imports.stage",
        "mcpTokens.create",
        "tax.bulkCreate",
        "tax.create",
        "transactions.create",
      ].sort(),
    );
    for (const route of allRoutes.filter((r) => successStatusOf(r) === 201)) {
      expect(route.method).toBe("POST");
    }
  });

  it("a delete with a JSON body answers 200, one without answers 204", () => {
    for (const route of allRoutes.filter((r) => r.method === "DELETE")) {
      expect(successStatusOf(route)).toBe(route.response ? 200 : 204);
    }
  });
});
