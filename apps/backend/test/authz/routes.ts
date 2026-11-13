import "reflect-metadata";
import { RequestMethod } from "@nestjs/common";
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { AppModule } from "../../src/app.module";
import { AuthGuard } from "../../src/auth/auth.guard";

export interface RegisteredRoute {
  /** "METHOD /path" with Nest `:param` syntax, the matrix key. */
  key: string;
  guarded: boolean;
}

const VERBS: Partial<Record<number, string>> = {
  [RequestMethod.GET]: "GET",
  [RequestMethod.POST]: "POST",
  [RequestMethod.PUT]: "PUT",
  [RequestMethod.PATCH]: "PATCH",
  [RequestMethod.DELETE]: "DELETE",
};

const joinPath = (a: string, b: string) =>
  `/${[a, b]
    .map((s) => s.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/")}`;

/**
 * Every route on AppModule's controllers, read from the Nest metadata the router uses (same as
 * test/contract/route-inventory.spec.ts), with whether AuthGuard is applied at class or method
 * level. APP_GUARD providers are not counted: only an explicit AuthGuard proves authentication.
 */
export function registeredRoutes(): RegisteredRoute[] {
  const controllers: Array<new (...args: never[]) => unknown> =
    Reflect.getMetadata("controllers", AppModule) ?? [];
  const routes: RegisteredRoute[] = [];
  for (const controller of controllers) {
    const prefix = (Reflect.getMetadata(PATH_METADATA, controller) as string | undefined) ?? "/";
    const classGuards: unknown[] = Reflect.getMetadata(GUARDS_METADATA, controller) ?? [];
    for (const name of Object.getOwnPropertyNames(controller.prototype)) {
      const handler = (controller.prototype as Record<string, unknown>)[name];
      if (typeof handler !== "function") continue;
      const verb = Reflect.getMetadata(METHOD_METADATA, handler) as number | undefined;
      if (verb === undefined || VERBS[verb] === undefined) continue;
      const sub = (Reflect.getMetadata(PATH_METADATA, handler) as string | undefined) ?? "/";
      const methodGuards: unknown[] = Reflect.getMetadata(GUARDS_METADATA, handler) ?? [];
      routes.push({
        key: `${VERBS[verb]} ${joinPath(prefix, sub)}`,
        guarded: [...classGuards, ...methodGuards].includes(AuthGuard),
      });
    }
  }
  return routes;
}
