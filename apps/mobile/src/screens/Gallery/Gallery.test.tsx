import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react-native";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { Gallery, PANELS } from "./Gallery";
import { GALLERY } from "./galleryEntries";

describe("Gallery", () => {
  it("lists every component folder in src/components", () => {
    const folders = readdirSync(resolve(__dirname, "../../components"), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    expect(GALLERY.map((e) => e.component).sort()).toEqual(folders);
  });

  it("shows each component in light, dark and 200% text", async () => {
    await render(
      <ThemeProvider scheme="light">
        <Gallery />
      </ThemeProvider>,
    );
    expect(PANELS.map((p) => p.title)).toEqual(["Light", "Dark", "200% text"]);
    for (const { component } of GALLERY) {
      for (const { title } of PANELS) {
        expect(screen.getByText(`${component}, ${title}`)).toBeOnTheScreen();
      }
    }
  });

  it("shows every named state once per panel", async () => {
    await render(
      <ThemeProvider scheme="light">
        <Gallery />
      </ThemeProvider>,
    );
    const button = GALLERY.find((e) => e.component === "Button");
    expect(button?.states.map((s) => s.name)).toContain("pending");
    expect(screen.getAllByText("pending")).toHaveLength(PANELS.length);
  });
});
