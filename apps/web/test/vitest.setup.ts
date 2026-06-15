import { configure } from "@testing-library/react";
import React, { type ReactNode } from "react";

if (!global.window) global.window = {} as any;

beforeAll(() => {
  if (
    typeof window !== "undefined" &&
    window.HTMLFormElement &&
    !window.HTMLFormElement.prototype.requestSubmit
  ) {
    window.HTMLFormElement.prototype.requestSubmit = function (submitter?: HTMLElement) {
      if (submitter) {
        submitter.click();
      } else {
        const event = new window.Event("submit", { bubbles: true, cancelable: true });
        this.dispatchEvent(event);
      }
    };
  }
});

vi.mock("react-router", async () => {
  const actual: Record<string, unknown> = await vi.importActual("react-router");
  const mockSubmit = vi.fn();
  return {
    ...actual,
    Link: (props: any): ReactNode => props.children,
    NavLink: (props: any): ReactNode => {
      const className =
        typeof props.className === "function"
          ? props.className({ isActive: false, isPending: false })
          : props.className;
      return React.createElement("a", { className, href: props.to }, props.children);
    },
    Form: ({ children }: any) => children,
    useSubmit: () => mockSubmit,
    useFetcher: () => ({
      submit: mockSubmit,
      state: "idle",
      data: null,
      Form: ({ children }: any) => children,
    }),
    useLoaderData: () => ({}),
    useRevalidator: () => ({ revalidate: vi.fn() }),
  };
});

vi.mock("react-i18next", () => ({
  Trans: ({ children }: any) => children,
  useTranslation: () => {
    return {
      t: (str: string) => str,
      i18n: {
        changeLanguage: () => new Promise(() => ({})),
      },
    };
  },
}));

configure({ testIdAttribute: "id" });

afterEach(() => {
  vi.clearAllMocks();
});
