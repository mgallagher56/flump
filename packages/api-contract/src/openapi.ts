import { z } from "zod";
import { allRoutes, type RouteDefinition } from "./manifest.js";
import { API_VERSION } from "./version.js";

type JsonObject = Record<string, unknown>;

const toJsonSchema = (schema: z.ZodType, io: "input" | "output" = "input"): JsonObject => {
  const { $schema: _ignored, ...rest } = z.toJSONSchema(schema, {
    io,
    unrepresentable: "any",
    target: "draft-2020-12",
  }) as JsonObject;
  return rest;
};

/** Nest `accounts/:id` to OpenAPI `/v1/accounts/{id}`. */
export const openApiPath = (route: RouteDefinition): string =>
  `/${API_VERSION}/${route.path.replace(/:([A-Za-z0-9_]+)/g, "{$1}")}`;

const parametersFor = (route: RouteDefinition): JsonObject[] => {
  const out: JsonObject[] = [];
  for (const [where, schema] of [
    ["path", route.params],
    ["query", route.query],
  ] as const) {
    if (!schema) continue;
    const json = toJsonSchema(schema) as { properties?: JsonObject; required?: string[] };
    for (const [name, property] of Object.entries(json.properties ?? {})) {
      out.push({
        name,
        in: where,
        required: where === "path" || (json.required ?? []).includes(name),
        schema: property,
      });
    }
  }
  return out;
};

const operationFor = (route: RouteDefinition): JsonObject => {
  const operation: JsonObject = {
    operationId: route.id,
    tags: [route.group],
    ...(route.aliasOf
      ? { deprecated: true, description: `Deprecated alias of ${route.aliasOf}.` }
      : {}),
    responses: {
      "200": route.response
        ? {
            description: "Success.",
            content: { "application/json": { schema: toJsonSchema(route.response, "output") } },
          }
        : { description: "Success. Not a JSON body (see NON_JSON_RESPONSE_ROUTES)." },
      "400": { description: "Request failed validation." },
      ...(route.auth === "public"
        ? {}
        : { "401": { description: "Missing or invalid credentials." } }),
    },
  };
  const parameters = parametersFor(route);
  if (parameters.length > 0) operation.parameters = parameters;
  if (route.body) {
    operation.requestBody = {
      required: true,
      content: { "application/json": { schema: toJsonSchema(route.body) } },
    };
  }
  operation.security =
    route.auth === "public" ? [] : [{ [route.auth === "pat" ? "patAuth" : "bearerAuth"]: [] }];
  return operation;
};

/** OpenAPI 3.1 document generated from the route manifest. Deterministic, so it can be checked in. */
export const buildOpenApiDocument = (): JsonObject => {
  const paths: Record<string, JsonObject> = {};
  for (const route of allRoutes) {
    const key = openApiPath(route);
    paths[key] = { ...paths[key], [route.method.toLowerCase()]: operationFor(route) };
  }
  return {
    openapi: "3.1.0",
    info: {
      title: "Flump API",
      version: "1.0.0",
      description: "Generated from @flump/api-contract. Do not edit by hand.",
    },
    servers: [{ url: "/" }],
    paths,
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        patAuth: { type: "http", scheme: "bearer", description: "Personal access token (MCP)." },
      },
    },
  };
};
