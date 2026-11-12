import { describe, expect, it } from "vitest";
import { loader } from "./app.forecast";

describe("app.forecast", () => {
  it("permanently redirects the retired Forecast page to the Savings forecaster", () => {
    const res = loader() as Response;
    expect(res.status).toBe(301);
    expect(res.headers.get("Location")).toBe("/app/savings#forecast");
  });
});
