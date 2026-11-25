import type { Meta, StoryObj } from "@storybook/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { expect, within } from "storybook/test";
import { LegalLink, LegalPage, LegalSection } from "./LegalPage";

const Example = () => (
  <LegalPage description="An example legal page." intro="A short introduction." page="terms">
    <LegalSection id="first" title="First section">
      <p>
        A paragraph of running text with a <LegalLink to="/privacy">link</LegalLink> in it.
      </p>
      <h3>A sub-heading</h3>
      <ul>
        <li>
          <strong>A point:</strong> with detail after it.
        </li>
        <li>A second point.</li>
      </ul>
    </LegalSection>
  </LegalPage>
);

const meta: Meta<typeof Example> = {
  title: "3. Patterns/Marketing/LegalPage",
  component: Example,
  decorators: [
    (Story) => (
      <HelmetProvider>
        <MemoryRouter>
          <Story />
        </MemoryRouter>
      </HelmetProvider>
    ),
  ],
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof Example>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("heading", { level: 1, name: "Terms of use" })).toBeInTheDocument();
  await expect(canvas.getByTestId("legal-version")).toHaveTextContent("Version 0.1");
  await expect(canvas.getByRole("navigation", { name: "Related pages" })).toBeInTheDocument();
};

export const Light: Story = { globals: { theme: "light" }, play };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play,
};
