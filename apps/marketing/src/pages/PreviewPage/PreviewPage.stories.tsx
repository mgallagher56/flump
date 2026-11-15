import type { Meta, StoryObj } from "@storybook/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { PreviewPage } from "./PreviewPage";

const meta: Meta<typeof PreviewPage> = {
  title: "Pages/PreviewPage",
  component: PreviewPage,
  decorators: [
    (Story) => (
      <HelmetProvider>
        <MemoryRouter>
          <Story />
        </MemoryRouter>
      </HelmetProvider>
    ),
  ],
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof PreviewPage>;

export const Default: Story = {};
