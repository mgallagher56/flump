import { describe, expect, it } from "vitest";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

describe("AppController", () => {
  it('should return "Flump API is running."', () => {
    const appService = new AppService();
    const appController = new AppController(appService);
    expect(appController.getHello()).toBe("Flump API is running.");
  });
});
