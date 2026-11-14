import "reflect-metadata";
import { allRoutes } from "@flump/api-contract";
import { RequestMethod } from "@nestjs/common";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";
import { AppModule } from "../../src/app.module";
import { moduleControllers } from "../../src/testing/module-controllers";

/**
 * Route coverage (E21 T0.8): the manifest in @flump/api-contract and the routes Nest registers
 * must match one to one. Adding a controller route without a manifest entry, or leaving a stale
 * manifest entry behind, fails here.
 */
const VERBS: Record<number, string> = {
  [RequestMethod.GET]: "GET",
  [RequestMethod.POST]: "POST",
  [RequestMethod.PATCH]: "PATCH",
  [RequestMethod.PUT]: "PUT",
  [RequestMethod.DELETE]: "DELETE",
};

const clean = (value: string) => value.replace(/^\/+|\/+$/g, "");

function registeredRoutes(): string[] {
  const controllers = moduleControllers(AppModule);
  const routes: string[] = [];
  for (const controller of controllers) {
    const prefix = (Reflect.getMetadata(PATH_METADATA, controller) as string | undefined) ?? "/";
    for (const name of Object.getOwnPropertyNames(controller.prototype)) {
      const handler = (controller.prototype as Record<string, unknown>)[name];
      if (typeof handler !== "function") continue;
      const verb = Reflect.getMetadata(METHOD_METADATA, handler) as number | undefined;
      if (verb === undefined || !VERBS[verb]) continue;
      const sub = (Reflect.getMetadata(PATH_METADATA, handler) as string | undefined) ?? "/";
      routes.push(`${VERBS[verb]} ${[clean(prefix), clean(sub)].filter(Boolean).join("/")}`);
    }
  }
  return routes.sort();
}

describe("api-contract route manifest", () => {
  it("matches the routes registered on AppModule exactly", () => {
    const manifest = allRoutes.map((route) => `${route.method} ${route.path}`).sort();
    expect(registeredRoutes()).toEqual(manifest);
  });
});
