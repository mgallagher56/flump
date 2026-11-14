/**
 * Breaking-change rules for the OpenAPI document (BE-09, audit M-API5). Pure functions over two
 * parsed documents, so the check and its tests share them. See docs/api/versioning.md.
 *
 * Breaking:
 * - a removed path, operation or success response code;
 * - in a response: a removed or retyped property, a removed enum value, or a property that was
 *   required and became optional;
 * - in a request (body or parameter): a property or parameter that became required, a new
 *   required one, a removed one (request objects are strict), or a narrowed type (fewer types,
 *   fewer enum values, tighter bounds, a new or changed pattern or format, closed objects).
 */

type Json = Record<string, unknown>;

export type BreakingKind =
  | "removed-path"
  | "removed-operation"
  | "removed-response"
  | "removed-response-property"
  | "retyped-response-property"
  | "removed-response-enum-value"
  | "response-became-optional"
  | "request-became-required"
  | "new-required-request-field"
  | "removed-request-field"
  | "narrowed-request-type";

export interface BreakingChange {
  kind: BreakingKind;
  /** Where, for example `PATCH /v1/accounts/{id} request body.balance`. */
  where: string;
  detail: string;
}

const METHODS = ["get", "post", "put", "patch", "delete"] as const;

const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Folds `allOf` members into one schema: properties and `required` are unioned, and any other
 * keyword is taken from the first schema that sets it (the outer schema first).
 */
export const mergeAllOf = (schema: Json): Json => {
  if (!Array.isArray(schema.allOf)) return schema;
  const { allOf, ...outer } = schema;
  const merged: Json = { ...outer };
  const properties: Json = isObject(outer.properties) ? { ...outer.properties } : {};
  const required = new Set<string>(Array.isArray(outer.required) ? outer.required : []);
  let hasProperties = isObject(outer.properties);
  for (const member of (allOf as unknown[]).filter(isObject).map(mergeAllOf)) {
    for (const [key, value] of Object.entries(member)) {
      if (key === "properties" && isObject(value)) {
        hasProperties = true;
        for (const [name, prop] of Object.entries(value)) properties[name] ??= prop;
      } else if (key === "required" && Array.isArray(value)) {
        for (const name of value) required.add(String(name));
      } else if (!(key in merged)) {
        merged[key] = value;
      }
    }
  }
  if (hasProperties) merged.properties = properties;
  if (required.size > 0) merged.required = [...required];
  return merged;
};

const branches = (input: Json): Json[] => {
  const schema = mergeAllOf(input);
  const nested = [schema.anyOf, schema.oneOf].flatMap((list) =>
    Array.isArray(list) ? list.filter(isObject) : [],
  );
  return nested.length > 0 ? nested.flatMap(branches) : [schema];
};

const typeOfValue = (value: unknown): string =>
  value === null ? "null" : Array.isArray(value) ? "array" : typeof value;

/** The JSON types a schema allows, or null when it allows anything. */
export const typesOf = (schema: Json): Set<string> | null => {
  const out = new Set<string>();
  for (const branch of branches(schema)) {
    if (typeof branch.type === "string") out.add(branch.type);
    else if (Array.isArray(branch.type)) for (const t of branch.type) out.add(String(t));
    else if ("const" in branch) out.add(typeOfValue(branch.const));
    else if (Array.isArray(branch.enum)) for (const v of branch.enum) out.add(typeOfValue(v));
    else if (isObject(branch.properties)) out.add("object");
    else if (isObject(branch.items)) out.add("array");
    else return null;
  }
  return out;
};

/** Enum values (from `enum` and `const`) when every branch is an enumeration, else null. */
const enumOf = (schema: Json): Set<string> | null => {
  const values = new Set<string>();
  let enumerated = false;
  for (const branch of branches(schema)) {
    if (Array.isArray(branch.enum)) {
      enumerated = true;
      for (const v of branch.enum) values.add(JSON.stringify(v));
    } else if ("const" in branch) {
      enumerated = true;
      values.add(JSON.stringify(branch.const));
    } else if (branch.type !== "null") {
      return null;
    }
  }
  return enumerated ? values : null;
};

const objectOf = (schema: Json): Json | undefined =>
  branches(schema).find((b) => isObject(b.properties));

const arrayOf = (schema: Json): Json | undefined => branches(schema).find((b) => isObject(b.items));

const sameTypes = (a: Set<string>, b: Set<string>): boolean =>
  a.size === b.size && [...a].every((t) => b.has(t));

/** Old types the new schema no longer accepts (`integer` fits inside `number`). */
const lostTypes = (before: Set<string>, after: Set<string>): string[] =>
  [...before].filter((t) => !after.has(t) && !(t === "integer" && after.has("number")));

function compareResponse(before: Json, after: Json, where: string, out: BreakingChange[]): void {
  const oldTypes = typesOf(before);
  const newTypes = typesOf(after);
  if (oldTypes && newTypes && !sameTypes(oldTypes, newTypes)) {
    out.push({
      kind: "retyped-response-property",
      where,
      detail: `type ${[...oldTypes].sort().join("|")} became ${[...newTypes].sort().join("|")}`,
    });
    return;
  }
  const oldEnum = enumOf(before);
  const newEnum = enumOf(after);
  if (oldEnum && newEnum) {
    for (const value of oldEnum) {
      if (!newEnum.has(value)) {
        out.push({ kind: "removed-response-enum-value", where, detail: `${value} removed` });
      }
    }
  }
  const oldObject = objectOf(before);
  const newObject = objectOf(after);
  if (oldObject && newObject) {
    const oldProps = oldObject.properties as Json;
    const newProps = newObject.properties as Json;
    const oldRequired = new Set((oldObject.required as string[] | undefined) ?? []);
    const newRequired = new Set((newObject.required as string[] | undefined) ?? []);
    for (const [name, schema] of Object.entries(oldProps)) {
      const next = newProps[name];
      if (!isObject(next)) {
        out.push({
          kind: "removed-response-property",
          where: `${where}.${name}`,
          detail: "removed",
        });
        continue;
      }
      if (oldRequired.has(name) && !newRequired.has(name)) {
        out.push({
          kind: "response-became-optional",
          where: `${where}.${name}`,
          detail: "was required, now optional",
        });
      }
      if (isObject(schema)) {
        compareResponse(schema, next, `${where}.${name}`, out);
      }
    }
  }
  const oldArray = arrayOf(before);
  const newArray = arrayOf(after);
  if (oldArray && newArray) {
    compareResponse(oldArray.items as Json, newArray.items as Json, `${where}[]`, out);
  }
}

const LOWER_BOUNDS = ["minLength", "minimum", "exclusiveMinimum", "minItems", "minProperties"];
const UPPER_BOUNDS = ["maxLength", "maximum", "exclusiveMaximum", "maxItems", "maxProperties"];

/** A single-branch view used for bounds: the one non-null branch, if there is exactly one. */
const soleBranch = (schema: Json): Json | undefined => {
  const real = branches(schema).filter((b) => b.type !== "null");
  return real.length === 1 ? real[0] : undefined;
};

function compareRequest(before: Json, after: Json, where: string, out: BreakingChange[]): void {
  const narrowed = (detail: string) => out.push({ kind: "narrowed-request-type", where, detail });
  const oldTypes = typesOf(before);
  const newTypes = typesOf(after);
  if (newTypes) {
    const lost = oldTypes ? lostTypes(oldTypes, newTypes) : ["any"];
    if (lost.length > 0) {
      narrowed(`no longer accepts ${lost.sort().join("|")}`);
      return;
    }
  }
  const oldEnum = enumOf(before);
  const newEnum = enumOf(after);
  if (newEnum && !oldEnum) narrowed("now limited to an enumeration");
  if (newEnum && oldEnum) {
    for (const value of oldEnum) if (!newEnum.has(value)) narrowed(`enum value ${value} removed`);
  }
  const oldOne = soleBranch(before);
  const newOne = soleBranch(after);
  if (oldOne && newOne) {
    for (const key of LOWER_BOUNDS) {
      const a = oldOne[key];
      const b = newOne[key];
      if (typeof b === "number" && (typeof a !== "number" || b > a))
        narrowed(`${key} ${a ?? "none"} -> ${b}`);
    }
    for (const key of UPPER_BOUNDS) {
      const a = oldOne[key];
      const b = newOne[key];
      if (typeof b === "number" && (typeof a !== "number" || b < a))
        narrowed(`${key} ${a ?? "none"} -> ${b}`);
    }
    for (const key of ["pattern", "format"]) {
      if (newOne[key] !== undefined && newOne[key] !== oldOne[key]) {
        narrowed(`${key} ${JSON.stringify(oldOne[key] ?? null)} -> ${JSON.stringify(newOne[key])}`);
      }
    }
  }
  const oldObject = objectOf(before);
  const newObject = objectOf(after);
  if (oldObject && newObject) {
    const oldProps = oldObject.properties as Json;
    const newProps = newObject.properties as Json;
    const oldRequired = new Set((oldObject.required as string[] | undefined) ?? []);
    for (const name of (newObject.required as string[] | undefined) ?? []) {
      if (!(name in oldProps)) {
        out.push({
          kind: "new-required-request-field",
          where: `${where}.${name}`,
          detail: "new and required",
        });
      } else if (!oldRequired.has(name)) {
        out.push({
          kind: "request-became-required",
          where: `${where}.${name}`,
          detail: "was optional",
        });
      }
    }
    const closed = newObject.additionalProperties === false;
    if (closed && oldObject.additionalProperties !== false) narrowed("now rejects unknown keys");
    for (const [name, schema] of Object.entries(oldProps)) {
      const next = newProps[name];
      if (!isObject(next)) {
        if (closed)
          out.push({
            kind: "removed-request-field",
            where: `${where}.${name}`,
            detail: "removed from a strict object",
          });
      } else if (isObject(schema)) {
        compareRequest(schema, next, `${where}.${name}`, out);
      }
    }
  }
  const oldArray = arrayOf(before);
  const newArray = arrayOf(after);
  if (oldArray && newArray) {
    compareRequest(oldArray.items as Json, newArray.items as Json, `${where}[]`, out);
  }
}

const jsonSchemaOf = (holder: unknown): Json | undefined => {
  const content = isObject(holder) && isObject(holder.content) ? holder.content : undefined;
  const media =
    content && isObject(content["application/json"]) ? content["application/json"] : undefined;
  return media && isObject(media.schema) ? media.schema : undefined;
};

interface Parameter {
  name: string;
  in: string;
  required?: boolean;
  schema?: Json;
}

const parametersOf = (operation: Json): Map<string, Parameter> =>
  new Map(
    ((operation.parameters as Parameter[] | undefined) ?? []).map((p) => [`${p.in}:${p.name}`, p]),
  );

function compareOperation(before: Json, after: Json, label: string, out: BreakingChange[]): void {
  const oldResponses = (before.responses as Json | undefined) ?? {};
  const newResponses = (after.responses as Json | undefined) ?? {};
  for (const [code, response] of Object.entries(oldResponses)) {
    if (!code.startsWith("2")) continue;
    if (!(code in newResponses)) {
      out.push({
        kind: "removed-response",
        where: `${label} ${code}`,
        detail: "success response removed",
      });
      continue;
    }
    const a = jsonSchemaOf(response);
    const b = jsonSchemaOf(newResponses[code]);
    if (a && b) compareResponse(a, b, `${label} ${code} response`, out);
  }

  const oldBody = isObject(before.requestBody) ? before.requestBody : undefined;
  const newBody = isObject(after.requestBody) ? after.requestBody : undefined;
  if (newBody?.required === true && !oldBody) {
    out.push({
      kind: "new-required-request-field",
      where: `${label} request body`,
      detail: "a body is now required",
    });
  }
  const a = jsonSchemaOf(oldBody);
  const b = jsonSchemaOf(newBody);
  if (a && b) compareRequest(a, b, `${label} request body`, out);

  const oldParams = parametersOf(before);
  const newParams = parametersOf(after);
  for (const [key, param] of newParams) {
    const old = oldParams.get(key);
    const where = `${label} ${param.in} parameter ${param.name}`;
    if (!old) {
      if (param.required)
        out.push({ kind: "new-required-request-field", where, detail: "new and required" });
      continue;
    }
    if (param.required && !old.required) {
      out.push({ kind: "request-became-required", where, detail: "was optional" });
    }
    if (old.schema && param.schema) compareRequest(old.schema, param.schema, where, out);
  }
  for (const [key, param] of oldParams) {
    if (!newParams.has(key) && param.in === "query") {
      out.push({
        kind: "removed-request-field",
        where: `${label} query parameter ${param.name}`,
        detail: "removed (query objects are strict)",
      });
    }
  }
}

/** Every breaking change from `before` (the committed document) to `after` (the regenerated one). */
export function findBreakingChanges(before: Json, after: Json): BreakingChange[] {
  const out: BreakingChange[] = [];
  const oldPaths = (before.paths as Json | undefined) ?? {};
  const newPaths = (after.paths as Json | undefined) ?? {};
  for (const [path, item] of Object.entries(oldPaths)) {
    const next = newPaths[path];
    if (!isObject(next)) {
      out.push({ kind: "removed-path", where: path, detail: "path removed" });
      continue;
    }
    for (const method of METHODS) {
      const operation = isObject(item) ? item[method] : undefined;
      if (!isObject(operation)) continue;
      const label = `${method.toUpperCase()} ${path}`;
      const replacement = next[method];
      if (!isObject(replacement)) {
        out.push({ kind: "removed-operation", where: label, detail: "operation removed" });
        continue;
      }
      compareOperation(operation, replacement, label, out);
    }
  }
  const oldSchemas = isObject(before.components)
    ? (before.components.schemas as Json | undefined)
    : undefined;
  const newSchemas = isObject(after.components)
    ? (after.components.schemas as Json | undefined)
    : undefined;
  for (const [name, schema] of Object.entries(oldSchemas ?? {})) {
    const next = newSchemas?.[name];
    if (!isObject(next)) {
      out.push({
        kind: "removed-response-property",
        where: `components.schemas.${name}`,
        detail: "removed",
      });
    } else if (isObject(schema)) {
      compareResponse(schema, next, `components.schemas.${name}`, out);
    }
  }
  return out;
}

/** Deep equality for parsed JSON (key order ignored). */
export function jsonEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((item, i) => jsonEqual(item, b[i]))
    );
  }
  if (!isObject(a) || !isObject(b)) return false;
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => key in b && jsonEqual(a[key], b[key]))
  );
}
