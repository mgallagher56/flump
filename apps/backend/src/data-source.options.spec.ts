import { describe, expect, it } from "vitest";
import { cliDataSourceOptions } from "./data-source.options";

describe("cliDataSourceOptions", () => {
  it("never auto-runs migrations, even in a strict environment", () => {
    const options = cliDataSourceOptions({
      NODE_ENV: "production",
      DATABASE_URL: "postgres://u:p@db.example.com/x",
      BANKING_TOKEN_ENCRYPTION_KEY: "k".repeat(32),
    });
    expect(options.migrationsRun).toBe(false);
  });
});
