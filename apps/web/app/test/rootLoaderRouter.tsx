import { createContext, type ReactNode, useContext, useState } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";

/**
 * Tests: renders `children` inside a real data router whose root route ("root") answers with
 * `data`, as the app's root loader does. The profile comes from loader data only (audit slice 8),
 * so anything that reads it needs this. Change `data` (or pass a function) and a revalidation
 * returns the new value, as a reload of saved data would.
 */
export interface RootLoaderData {
  user?: unknown;
  userProfile?: unknown;
  [key: string]: unknown;
}

export function rootLoaderRouter(
  children: ReactNode,
  data: RootLoaderData | (() => RootLoaderData) = {},
  initialPath = "/",
) {
  const read = () => (typeof data === "function" ? data() : data);
  return createMemoryRouter([{ id: "root", path: "*", element: children, loader: () => read() }], {
    initialEntries: [initialPath],
    hydrationData: { loaderData: { root: read() } },
  });
}

const WrappedChildren = createContext<ReactNode>(null);
function ChildrenOfWrapper() {
  return <>{useContext(WrappedChildren)}</>;
}

type LoaderDataSource = RootLoaderData | (() => RootLoaderData);

/** One router per render tree, so a revalidation keeps its state; new children pass through. */
export function RootLoaderWrapper({
  data,
  children,
}: {
  data: LoaderDataSource;
  children: ReactNode;
}) {
  const [router] = useState(() => rootLoaderRouter(<ChildrenOfWrapper />, data));
  return (
    <WrappedChildren.Provider value={children}>
      <RouterProvider router={router} />
    </WrappedChildren.Provider>
  );
}

/** `renderHook` / `render` wrapper form of `rootLoaderRouter`. */
export const withRootLoader =
  (data: LoaderDataSource = {}) =>
  ({ children }: { children: ReactNode }) => (
    <RootLoaderWrapper data={data}>{children}</RootLoaderWrapper>
  );
