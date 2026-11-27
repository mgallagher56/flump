import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { css } from "../../../styled-system/css";
import { EmptyState } from "../../patterns/EmptyState/EmptyState";
import { Button } from "../Button/Button";
import { Text } from "../Text/Text";
import { Illustration } from "./Illustration";
import {
  DOCUMENT_GRID_WIDTH,
  DOCUMENT_MIN_TEXT,
  documentDefinitions,
  documentExtraIds,
  documentSceneIds,
  walkDocument,
} from "./Illustration.documents";
import { illustrationScenes } from "./Illustration.scenes";

const grid = css({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "6",
  p: "6",
  backgroundColor: "surface.canvas",
});

const meta: Meta<typeof Illustration> = {
  title: "2. Primitives/Illustration",
  component: Illustration,
  parameters: { layout: "padded" },
  args: { scene: "empty-accounts" },
};

export default meta;
type Story = StoryObj<typeof Illustration>;

const SceneGallery = () => (
  <div className={grid}>
    {illustrationScenes.map((scene) => (
      <EmptyState
        key={scene}
        description="Soft decorative artwork, hidden from assistive technology."
        headingLevel="h3"
        id={`scene-${scene}`}
        illustration={<Illustration scene={scene} />}
        title={scene}
        size="sm"
        action={<Button size="sm">Continue</Button>}
      />
    ))}
  </div>
);

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  // Artwork is decorative: nothing is exposed as an image.
  await expect(canvas.queryAllByRole("img")).toHaveLength(0);
  const hidden = canvasElement.querySelectorAll('svg[aria-hidden="true"]');
  await expect(hidden.length).toBe(illustrationScenes.length);
};

export const Light: Story = { globals: { theme: "light" }, render: () => <SceneGallery />, play };

export const Dark: Story = { globals: { theme: "dark" }, render: () => <SceneGallery />, play };

export const Large: Story = {
  args: { scene: "not-found", size: "lg" },
  globals: { theme: "light" },
};

const assertSpot: Story["play"] = async ({ canvasElement }) => {
  const svg = canvasElement.querySelector('svg[aria-hidden="true"]') as SVGElement;
  // xl caps the scene at 20rem (320px); the story canvas is wider, so it renders at the cap.
  await expect(svg.getBoundingClientRect().width).toBeLessThanOrEqual(320);
  await expect(svg.getBoundingClientRect().width).toBeGreaterThan(260);
};

export const ExtraLarge: Story = {
  args: { scene: "check-in", size: "xl", settle: false },
  globals: { theme: "light" },
  play: assertSpot,
};

export const ExtraLargeDark: Story = {
  args: { scene: "onboarding", size: "xl", settle: false },
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertSpot,
};

/* ---------------------------------------------------------------------------------------------
 * Document card pictures (STYLE-GUIDE 8.3): the owner's picks, the features tiles and the
 * security card, as one sheet like prototype 11's image sheet.
 * ------------------------------------------------------------------------------------------- */

const sheet = css({
  backgroundColor: "surface.canvas",
  p: { base: "4", md: "8" },
  display: "grid",
  gap: "8",
});

const sheetGrid = css({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))",
  gap: "5",
});

const sheetCell = css({
  display: "grid",
  justifyItems: "center",
  alignContent: "start",
  gap: "3",
  p: "4",
  borderRadius: "card",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "border",
  backgroundColor: "surface.card",
  minWidth: "0",
});

// Fixed frames, so each story shows the sheet at exactly that page width.
const frames = {
  375: css({ width: "375px", maxWidth: "none" }),
  1280: css({ width: "1280px", maxWidth: "none" }),
};

const DocumentSheet = ({ width }: { width: 375 | 1280 }) => (
  <div className={frames[width]}>
    <div className={sheet}>
      {[
        { heading: "Scenes", ids: documentSceneIds },
        { heading: "Features tiles and security", ids: documentExtraIds },
      ].map(({ heading, ids }) => (
        <section key={heading} aria-label={heading} className={sheetGrid}>
          {ids.map((scene) => (
            <figure key={scene} className={sheetCell} data-sheet-cell={scene}>
              <Illustration scene={scene} variant="document" />
              <figcaption>
                <Text as="span" color="secondary" textStyle="body.sm">
                  {scene}: {documentDefinitions[scene].subject}
                </Text>
              </figcaption>
            </figure>
          ))}
        </section>
      ))}
    </div>
  </div>
);

const assertSheet: Story["play"] = async ({ canvasElement }) => {
  const pictures = canvasElement.querySelectorAll<SVGSVGElement>('svg[data-variant="document"]');
  await expect(pictures.length).toBe(documentSceneIds.length + documentExtraIds.length);
  for (const svg of pictures) {
    // Decorative, but every tag is real text.
    await expect(svg.getAttribute("aria-hidden")).toBe("true");
    const scene = svg.getAttribute("data-scene") as (typeof documentSceneIds)[number];
    const hasFigure = walkDocument(documentDefinitions[scene]).some(
      ({ shape }) =>
        shape.kind === "text" && shape.lines.some((line) => /£|%|\d+(\.\d+)? months?/.test(line)),
    );
    const tags = [...svg.querySelectorAll("[data-doc-tag] text")].map((t) => t.textContent);
    if (hasFigure) await expect(tags).toContain("Example");
    // The picture fits inside its cell: no sideways overflow at this page width.
    const cell = svg.closest("[data-sheet-cell]")?.getBoundingClientRect();
    const box = svg.getBoundingClientRect();
    await expect(box.left).toBeGreaterThanOrEqual((cell?.left ?? 0) - 0.5);
    await expect(box.right).toBeLessThanOrEqual((cell?.right ?? 0) + 0.5);
    // No text under 12px at the width it is drawn: grid units times the drawn scale.
    const scale = svg.getBoundingClientRect().width / DOCUMENT_GRID_WIDTH;
    await expect(DOCUMENT_MIN_TEXT * scale).toBeGreaterThanOrEqual(12);
  }
};

export const DocumentSheetLight1280: Story = {
  globals: { theme: "light" },
  render: () => <DocumentSheet width={1280} />,
  play: assertSheet,
};

export const DocumentSheetDark1280: Story = {
  globals: { theme: "dark" },
  render: () => <DocumentSheet width={1280} />,
  play: assertSheet,
};

export const DocumentSheetLight375: Story = {
  globals: { theme: "light" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: () => <DocumentSheet width={375} />,
  play: assertSheet,
};

export const DocumentSheetDark375: Story = {
  globals: { theme: "dark" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: () => <DocumentSheet width={375} />,
  play: assertSheet,
};

/** One document picture, with controls for the scene and the size. */
export const Document: Story = {
  args: { variant: "document", scene: "check-in", size: "lg" },
  globals: { theme: "light" },
};
