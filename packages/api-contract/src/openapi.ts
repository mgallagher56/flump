import { z } from "zod";
import { ErrorResponse } from "./errors.js";
import {
  ETAG_HEADER,
  IDEMPOTENCY_KEY_HEADER,
  IDEMPOTENCY_KEY_TTL_HOURS,
  IDEMPOTENT_REPLAYED_HEADER,
  IF_MATCH_HEADER,
} from "./http-headers.js";
import { allRoutes, isIdempotentRoute, type RouteDefinition, successStatusOf } from "./manifest.js";
import { NEXT_CURSOR_HEADER } from "./pagination.js";
import { MONEY_WIRE_DESCRIPTION } from "./primitives.js";
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
  if (isIdempotentRoute(route)) {
    out.push({
      name: IDEMPOTENCY_KEY_HEADER,
      in: "header",
      required: false,
      description: `Makes the create safe to retry. A repeat with the same key and body within ${IDEMPOTENCY_KEY_TTL_HOURS} hours replays the first response (with ${IDEMPOTENT_REPLAYED_HEADER}: true) and creates nothing.`,
      schema: { type: "string", minLength: 1, maxLength: 255, pattern: "^[\\x20-\\x7E]+$" },
    });
  }
  if (route.etag === "conditional") {
    out.push({
      name: IF_MATCH_HEADER,
      in: "header",
      required: false,
      description:
        "The ETag last read for this resource. When it no longer matches, nothing is written and the answer is 412 precondition_failed.",
      schema: { type: "string" },
    });
  }
  return out;
};

export const ERROR_RESPONSE_REF = "#/components/schemas/ErrorResponse";

const errorResponse = (description: string): JsonObject => ({
  description,
  content: { "application/json": { schema: { $ref: ERROR_RESPONSE_REF } } },
});

/** Routes no rate limiter covers (health probes are exempt, see SkipRateLimit). */
const isRateLimitExempt = (route: RouteDefinition): boolean =>
  route.auth === "public" && route.path.startsWith("health");

/**
 * The error statuses a route can answer, each with the shared ErrorResponse body (BE-09). Derived
 * from the route so a new route is documented without extra wiring.
 */
const errorResponsesFor = (route: RouteDefinition): Record<string, JsonObject> => {
  const out: Record<string, JsonObject> = {};
  if (route.params || route.query || route.body) {
    out["400"] = errorResponse("`validation_failed`: the request does not match the contract.");
  }
  if (route.auth !== "public") {
    out["401"] = errorResponse("`unauthorized`: missing or invalid credentials.");
  }
  if (route.auth === "user") {
    out["403"] = errorResponse("`forbidden` or `not_invited`: the account may not use this route.");
  }
  if (route.params || route.group === "imports") {
    out["404"] = errorResponse("`not_found`: no such resource for this user.");
  }
  if (route.group === "imports" && route.method === "POST") {
    out["409"] = errorResponse("`conflict`: the import batch is not in a state that allows this.");
  }
  if (isIdempotentRoute(route)) {
    out["409"] = errorResponse(
      "`conflict`: a request with the same Idempotency-Key is still in progress. Retry shortly.",
    );
  }
  if (route.etag === "conditional") {
    out["412"] = errorResponse(
      "`precondition_failed`: the resource changed since the If-Match ETag was read.",
    );
  }
  if (route.body) {
    out["413"] = errorResponse("`payload_too_large`: the request body is over the size limit.");
  }
  if (route.body) {
    out["422"] = errorResponse(
      isIdempotentRoute(route)
        ? "`constraint_violation`: the data breaks a stored rule and was not saved. `idempotency_key_reused`: the Idempotency-Key was used with a different body."
        : "`constraint_violation`: the data breaks a stored rule and was not saved.",
    );
  }
  if (!isRateLimitExempt(route)) {
    out["429"] = errorResponse("`rate_limited`: too many requests. See the Retry-After header.");
  }
  out["500"] = errorResponse("`internal_error`: an unexpected failure. Quote the requestId.");
  if (route.auth !== "public") {
    out["503"] = errorResponse(
      "`service_unavailable`: busy or temporarily unavailable. See the Retry-After header.",
    );
  }
  return out;
};

const stringHeader = (description: string): JsonObject => ({
  description,
  schema: { type: "string" },
});

/** Response headers a route's success answer may carry (pagination, versioning, replay). */
const successHeadersFor = (route: RouteDefinition): JsonObject | undefined => {
  const headers: JsonObject = {};
  if (route.page) {
    headers[NEXT_CURSOR_HEADER] = stringHeader(
      "The cursor of the next page: pass it back as `?cursor=`. Absent on the last page.",
    );
  }
  if (route.etag) {
    headers[ETAG_HEADER] = stringHeader(
      'The resource version, `"<updatedAt>"`. Send it as If-Match to make an update conditional.',
    );
  }
  if (isIdempotentRoute(route)) {
    headers[IDEMPOTENT_REPLAYED_HEADER] = stringHeader(
      "`true` when this is the stored response of an earlier request with the same Idempotency-Key.",
    );
  }
  return Object.keys(headers).length > 0 ? headers : undefined;
};

const successResponseFor = (route: RouteDefinition): Record<string, JsonObject> => {
  const status = String(successStatusOf(route));
  if (status === "204") return { [status]: { description: "Success. No body." } };
  const headers = successHeadersFor(route);
  return {
    [status]: {
      ...(route.response
        ? {
            description: "Success.",
            content: { "application/json": { schema: toJsonSchema(route.response, "output") } },
          }
        : { description: "Success. Not a JSON body (see NON_JSON_RESPONSE_ROUTES)." }),
      ...(headers ? { headers } : {}),
    },
  };
};

const operationFor = (route: RouteDefinition): JsonObject => {
  const operation: JsonObject = {
    operationId: route.id,
    tags: [route.group],
    ...(route.aliasOf
      ? {
          deprecated: true,
          description: `Deprecated alias of ${route.aliasOf}. Answers with Deprecation and Link headers.`,
        }
      : {}),
    responses: { ...successResponseFor(route), ...errorResponsesFor(route) },
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

const DESCRIPTION = [
  "Generated from @flump/api-contract. Do not edit by hand.",
  "",
  "The /v1 paths are the stable surface. The same routes without the /v1 prefix are deprecated",
  "aliases kept until clients have moved, and answer with Deprecation and Link headers (see",
  "docs/api/versioning.md). Within v1 only additive changes are made.",
  "",
  `Money: ${MONEY_WIRE_DESCRIPTION}`,
  "",
  "Errors: every non-2xx JSON response is an ErrorResponse with a stable `code` and the",
  "`requestId` that is also sent in the x-request-id header.",
  "",
  `Pagination: list routes take \`limit\` and \`cursor\`; the body stays a JSON array and the next`,
  `page's cursor is in the ${NEXT_CURSOR_HEADER} response header (absent on the last page).`,
].join("\n");

/** OpenAPI 3.1 document generated from the route manifest. Deterministic, so it can be checked in. */
export const buildOpenApiDocument = (): JsonObject => {
  const paths: Record<string, JsonObject> = {};
  for (const route of allRoutes) {
    const key = openApiPath(route);
    paths[key] = { ...paths[key], [route.method.toLowerCase()]: operationFor(route) };
  }
  return {
    openapi: "3.1.0",
    info: { title: "Flump API", version: "1.0.0", description: DESCRIPTION },
    servers: [{ url: "/" }],
    paths,
    components: {
      schemas: { ErrorResponse: toJsonSchema(ErrorResponse, "output") },
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        patAuth: { type: "http", scheme: "bearer", description: "Personal access token (MCP)." },
      },
    },
  };
};

/** A copy of `value` with every object's keys sorted, so the serialised document is stable. */
export const sortKeysDeep = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortKeysDeep((value as JsonObject)[key])]),
  );
};

/** The committed `openapi.json` text: sorted keys, two-space indent, trailing newline. */
export const serializeOpenApiDocument = (doc: unknown = buildOpenApiDocument()): string =>
  `${JSON.stringify(sortKeysDeep(doc), null, 2)}\n`;
