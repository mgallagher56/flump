// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { render } from "../entry-server";
import { AI_CONNECTION, MONEY_AREAS } from "./featureAreas";
import {
  ALL_FEATURE_LINES,
  FEATURE_GROUPS,
  FEATURE_TAG_LABELS,
  PAGES_NOT_LISTED,
  START_HERE,
} from "./featureIndex";
import { STATIC_PATHS } from "./toolSlugs";

const REPO = resolve(__dirname, "../../../..");
const MAP_DIR = resolve(REPO, "docs/system/functionality-map/pages/web");
const FEATURES_DOC = readFileSync(resolve(REPO, "docs/pages_and_features.md"), "utf8");

interface MapPage {
  id: string;
  route: string;
  auth: string;
  sections: string[];
}

/** The top-level fields and section ids of each web page in the functionality map. */
const mapPages: MapPage[] = readdirSync(MAP_DIR)
  .filter((name) => name.endsWith(".yaml"))
  .map((name) => {
    const text = readFileSync(resolve(MAP_DIR, name), "utf8");
    const field = (key: string) => text.match(new RegExp(`^${key}: (.+)$`, "m"))?.[1]?.trim() ?? "";
    return {
      id: field("id"),
      route: field("route"),
      auth: field("auth"),
      sections: [...text.matchAll(/^ {2}- id: (\S+)$/gm)].map((match) => match[1] ?? ""),
    };
  });
const pageById = new Map(mapPages.map((page) => [page.id, page]));

const linePages = ALL_FEATURE_LINES.flatMap((line) => ("page" in line.app ? [line.app.page] : []));

const sentences = (text: string) => text.split(/(?<=\.)\s+/);

describe("featureIndex: one source of truth with the app", () => {
  it("reads the functionality map (guards the parser)", () => {
    expect(pageById.get("budget")?.route).toBe("/app/budget");
    expect(pageById.get("budget")?.sections).toContain("breathing-room");
    expect(pageById.get("invites")?.auth).toBe("admin");
  });

  it("points every line at a page and section the functionality map has", () => {
    for (const line of ALL_FEATURE_LINES) {
      if (!("page" in line.app)) continue;
      const page = pageById.get(line.app.page);
      expect(page, `${line.id} -> ${line.app.page}`).toBeDefined();
      if (line.app.section) expect(page?.sections, line.id).toContain(line.app.section);
    }
  });

  it("lists every signed-in page, or says why not, so a new page fails here until it is added", () => {
    const signedIn = mapPages.filter((page) => page.auth === "required").map((page) => page.id);
    const missing = signedIn.filter(
      (id) => !linePages.includes(id) && !Object.hasOwn(PAGES_NOT_LISTED, id),
    );
    expect(missing).toEqual([]);
  });

  it("keeps PAGES_NOT_LISTED to real signed-in pages that have no line", () => {
    for (const id of Object.keys(PAGES_NOT_LISTED)) {
      expect(pageById.get(id)?.auth, id).toBe("required");
      expect(linePages, id).not.toContain(id);
    }
  });

  it("names every page it points at in docs/pages_and_features.md", () => {
    for (const id of new Set(linePages)) {
      const route = pageById.get(id)?.route ?? "";
      expect(FEATURES_DOC, `${id} (${route})`).toContain(`\`${route}\``);
    }
    expect(FEATURES_DOC).toContain("**Dark and light themes**");
    expect(FEATURES_DOC).toMatch(/`\/features`.*`FeatureIndex`/);
  });
});

describe("featureIndex: the page's shape", () => {
  it("groups by the app's areas in its navigation order, with setup first and settings last", () => {
    expect(FEATURE_GROUPS.map((group) => group.name)).toEqual([
      "Home and setup",
      ...MONEY_AREAS.map((area) => area.name),
      AI_CONNECTION.name,
      "Settings and your data",
    ]);
  });

  it("gives every line a unique id that cannot clash with the page's own ids", () => {
    const ids = ALL_FEATURE_LINES.map((line) => line.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(["main", "features-title", "start-here-title"]).not.toContain(id);
      expect(id.startsWith("group-")).toBe(false);
    }
  });

  it("keeps each line to six words, and each detail to two or three sentences of 25 words or fewer", () => {
    for (const line of ALL_FEATURE_LINES) {
      expect(line.line.split(" ").length, line.line).toBeLessThanOrEqual(6);
      expect(line.line, line.id).not.toMatch(/\.$/);
      const all = line.detail.flatMap(sentences);
      expect(all.length, line.id).toBeGreaterThanOrEqual(2);
      expect(all.length, line.id).toBeLessThanOrEqual(3);
      for (const sentence of all) {
        expect(sentence.split(/\s+/).length, sentence).toBeLessThanOrEqual(25);
      }
    }
  });

  it("labels the AI connection as a preview and Self Assessment as off by default, nothing else", () => {
    const tagged = Object.fromEntries(
      ALL_FEATURE_LINES.filter((line) => line.tag).map((line) => [line.id, line.tag]),
    );
    const groupOf = (id: string) => FEATURE_GROUPS.find((g) => g.lines.some((l) => l.id === id));
    for (const [id, tag] of Object.entries(tagged)) {
      if (tag === "preview") expect(groupOf(id)?.key, id).toBe("ai-connection");
      if (tag === "off-by-default") expect(groupOf(id)?.key, id).toBe("pay");
    }
    expect(tagged["ask-ai"]).toBe("preview");
    expect(tagged["self-assessment"]).toBe("off-by-default");
    expect(tagged["take-home-pay"]).toBeUndefined();
    expect(FEATURE_TAG_LABELS).toEqual({
      preview: "In testing",
      "off-by-default": "Off by default",
    });
  });

  it("lists nothing behind an off switch, and never names a forecast (E16 D5-B)", () => {
    const all = JSON.stringify(FEATURE_GROUPS);
    expect(all).not.toMatch(/household|connected bank|bank connection|open banking/i);
    expect(all).not.toMatch(/\bforecast/i);
    expect(all).not.toMatch(/—/);
  });

  it("keeps Start here to three or four goals, each pointing at lines that exist", () => {
    expect(START_HERE.length).toBeGreaterThanOrEqual(3);
    expect(START_HERE.length).toBeLessThanOrEqual(4);
    const ids = ALL_FEATURE_LINES.map((line) => line.id);
    for (const entry of START_HERE) {
      for (const id of entry.lines) expect(ids, entry.goal).toContain(id);
    }
  });

  it("sends every 'more' link to a real page and an anchor that page renders", () => {
    const htmlByPath = new Map<string, string>();
    for (const line of ALL_FEATURE_LINES) {
      if (!line.more) continue;
      const [path = "", anchor] = line.more.href.split("#");
      expect(STATIC_PATHS, line.id).toContain(path);
      if (!anchor) continue;
      if (!htmlByPath.has(path)) htmlByPath.set(path, render(path).html);
      expect(htmlByPath.get(path), `${line.id} -> ${line.more.href}`).toContain(`id="${anchor}"`);
    }
  });
});
