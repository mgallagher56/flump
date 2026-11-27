import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { useState } from "react";
import { css } from "../../../styled-system/css";
import { CarouselStepButton, getCarouselStep } from "../CarouselStepButton";
import { CarouselDots } from "./CarouselDots";

const SLIDES = [
  { name: "Accounts", text: "Every account in one place, grouped the way you think about them." },
  { name: "Budget", text: "What comes in, what goes out and how long your money lasts." },
  { name: "Net worth", text: "What you own and what you owe, side by side." },
  { name: "Check-in", text: "A few minutes once a month to bring your figures up to date." },
  { name: "Goals", text: "Plan for the things you are saving towards." },
  { name: "Self Assessment", text: "Get ready for your tax return with fewer surprises." },
];
const NAMES = SLIDES.map((s) => s.name);
const REGION_ID = "carousel-story-slides";

const wrap = css({
  display: "flex",
  flexDirection: "column",
  gap: "4",
  width: "100%",
  maxWidth: "640px",
});
const slide = css({
  p: "density.cardPad",
  borderRadius: "card",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "border",
  backgroundColor: "surface.card",
  color: "text.primary",
  minHeight: "120px",
});
const slideTitle = css({ textStyle: "heading.sm", mb: "2" });
const slideText = css({ textStyle: "body.md", color: "text.secondary" });
const controlsRow = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "2",
});

const ComposedCarousel = ({ loop = false }: { loop?: boolean }) => {
  const [current, setCurrent] = useState(0);
  const prev = getCarouselStep(current, SLIDES.length, "previous", loop);
  const next = getCarouselStep(current, SLIDES.length, "next", loop);
  const item = SLIDES[current] ?? SLIDES[0];
  return (
    <div className={wrap}>
      <section aria-label="Features" className={slide} id={REGION_ID}>
        <h2 className={slideTitle}>{item?.name}</h2>
        <p className={slideText}>{item?.text}</p>
      </section>
      <div className={controlsRow}>
        <CarouselStepButton
          controls={REGION_ID}
          direction="previous"
          disabled={prev === null}
          onClick={() => prev !== null && setCurrent(prev)}
          targetLabel={prev === null ? undefined : NAMES[prev]}
        />
        <CarouselDots
          controls={REGION_ID}
          current={current}
          itemLabels={NAMES}
          label="Features"
          onSelect={setCurrent}
        />
        <CarouselStepButton
          controls={REGION_ID}
          direction="next"
          disabled={next === null}
          onClick={() => next !== null && setCurrent(next)}
          targetLabel={next === null ? undefined : NAMES[next]}
        />
      </div>
    </div>
  );
};

const meta: Meta<typeof CarouselDots> = {
  title: "2. Primitives/CarouselDots",
  component: CarouselDots,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof CarouselDots>;

/** Tab goes previous, each dot, then next; choosing a dot shows its item and says so politely. */
const composedPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const prev = canvas.getByRole("button", { name: "Previous" });
  const next = canvas.getByRole("button", { name: "Next: Budget" });
  const dots = within(canvas.getByRole("group", { name: "Features" })).getAllByRole("button");
  await expect(dots.map((d) => d.textContent)).toEqual(NAMES);
  await expect(prev).toHaveAttribute("aria-disabled", "true");
  // Previous, every dot and next sit on one row, at 375 as at 1280.
  const tops = [prev, ...dots, next].map((el) => Math.round(el.getBoundingClientRect().top));
  const centres = [prev, ...dots, next].map((el) => {
    const box = el.getBoundingClientRect();
    return Math.round(box.top + box.height / 2);
  });
  await expect(new Set(centres).size).toBe(1);
  await expect(tops.length).toBe(NAMES.length + 2);

  (document.activeElement as HTMLElement | null)?.blur();
  for (const el of [prev, ...dots, next]) {
    await userEvent.tab();
    await expect(document.activeElement).toBe(el);
  }

  await userEvent.click(canvas.getByRole("button", { name: "Net worth" }));
  await expect(canvas.getByRole("button", { name: "Net worth" })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await expect(canvas.getByRole("heading", { name: "Net worth" })).toBeInTheDocument();
  await expect(canvas.getByRole("button", { name: "Previous: Budget" })).toBeInTheDocument();
  await waitFor(() => expect(canvas.getByRole("status")).toHaveTextContent("Showing Net worth"));
  await expect(canvasElement.textContent ?? "").not.toMatch(/\d+ (to|of) \d+/);
};

const phone375 = {
  viewports: {
    phone375: { name: "Phone 375", styles: { width: "375px", height: "812px" }, type: "mobile" },
  },
  defaultViewport: "phone375",
};
const desktop1280 = {
  viewports: {
    desktop1280: {
      name: "Desktop 1280",
      styles: { width: "1280px", height: "800px" },
      type: "desktop",
    },
  },
  defaultViewport: "desktop1280",
};

export const ComposedLight375: Story = {
  globals: { theme: "light" },
  parameters: { viewport: phone375 },
  render: () => <ComposedCarousel />,
  play: composedPlay,
};

export const ComposedDark375: Story = {
  globals: { theme: "dark" },
  parameters: { viewport: phone375 },
  render: () => <ComposedCarousel />,
  play: composedPlay,
};

export const ComposedLight1280: Story = {
  globals: { theme: "light" },
  parameters: { viewport: desktop1280 },
  render: () => <ComposedCarousel />,
  play: composedPlay,
};

export const ComposedDark1280: Story = {
  globals: { theme: "dark" },
  parameters: { viewport: desktop1280 },
  render: () => <ComposedCarousel />,
  play: composedPlay,
};

/** With `loop`, previous on the first item goes to the last. */
export const Looping: Story = {
  globals: { theme: "light" },
  render: () => <ComposedCarousel loop />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Previous: Self Assessment" }));
    await expect(canvas.getByRole("button", { name: "Self Assessment" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  },
};
