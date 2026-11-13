import { describe, expect, it } from "vitest";
import { loader } from "./app.tax._index";

describe("app.tax._index", () => {
  it("permanently redirects the old Tax URL to Self Assessment", () => {
    const res = loader() as Response;
    expect(res.status).toBe(301);
    expect(res.headers.get("Location")).toBe("/app/self-assessment");
  });
});
