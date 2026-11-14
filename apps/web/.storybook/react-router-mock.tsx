import { createContext, type ReactElement, type ReactNode, useContext } from "react";
// "react-router-real" is aliased in main.ts to the real package entry, because "react-router" itself is aliased to this mock.
import { UNSAFE_DataRouterContext, useRevalidator as useRealRevalidator } from "react-router-real";

export {
  createRoutesStub,
  data,
  isRouteErrorResponse,
  MemoryRouter,
  // Marketing page stories render inside a real MemoryRouter with real routes and params.
  Route,
  Routes,
  useParams,
  useRouteError,
} from "react-router-real";

export interface MockRouterContextType {
  loaderData: any;
  fetcher: {
    submit: (target: any, options?: any) => void;
    state: "idle" | "submitting" | "loading";
    Form: (props: { children: ReactNode; [key: string]: any }) => ReactElement;
  };
  navigate: (to: string, options?: any) => void;
  /** What `useNavigation` reports; defaults to idle. */
  navigationState?: "idle" | "loading" | "submitting";
  location?: { pathname: string; search: string; hash: string; state: any; key: string };
}

export const StorybookRouterContext = createContext<MockRouterContextType>({
  loaderData: {},
  fetcher: {
    submit: () => {},
    state: "idle",
    Form: ({ children, ...props }) => <form {...props}>{children}</form>,
  },
  navigate: () => {},
  location: { pathname: "/", search: "", hash: "", state: null, key: "default" },
});

// Plain <form> stand-in so stories render without a data router.
export const Form = ({ children, ...props }: { children?: ReactNode; [key: string]: any }) => (
  <form {...props}>{children}</form>
);

export const useLoaderData = () => {
  const context = useContext(StorybookRouterContext);
  return context.loaderData;
};

export const useRouteLoaderData = (routeId: string) => {
  const context = useContext(StorybookRouterContext);
  return context.loaderData?.[routeId] ?? context.loaderData;
};

export const useFetcher = () => {
  const context = useContext(StorybookRouterContext);
  return context.fetcher;
};

export const useNavigate = () => {
  const context = useContext(StorybookRouterContext);
  return context.navigate;
};

// Stories have no data router, so navigation is never blocked.
export const useBlocker = () => ({
  state: "unblocked" as const,
  proceed: undefined,
  reset: undefined,
});

export const useLocation = () => {
  const context = useContext(StorybookRouterContext);
  return context.location || { pathname: "/", search: "", hash: "", state: null, key: "default" };
};

export const useSearchParams = () => {
  const [params, setParams] = [new URLSearchParams(), () => {}];
  return [params, setParams] as const;
};

// Inside a real data router (e.g. createRoutesStub) use the real hook so revalidation re-runs loaders;
// otherwise fall back to the inert fake. The branch is stable for a given component instance.
export const useRevalidator = () => {
  const inDataRouter = useContext(UNSAFE_DataRouterContext) != null;
  if (inDataRouter) {
    // biome-ignore lint/correctness/useHookAtTopLevel: branch is stable per mounted instance
    return useRealRevalidator();
  }
  return { revalidate: () => {}, state: "idle" as const };
};

export const useNavigation = () => {
  const { navigationState } = useContext(StorybookRouterContext);
  return { state: navigationState ?? ("idle" as const), location: undefined };
};

export const useSubmit = () => {
  return () => {};
};

export const Link = ({ to, children, className, ...props }: any) => {
  const { navigate } = useContext(StorybookRouterContext);
  return (
    <a
      className={className}
      href={to}
      onClick={(e) => {
        e.preventDefault();
        navigate(to);
      }}
      {...props}
    >
      {children}
    </a>
  );
};

// NavLink accepts className/children as functions of its active state; stories never match a route.
export const NavLink = ({ className, children, end: _end, ...props }: any) => {
  const state = { isActive: false, isPending: false, isTransitioning: false };
  return (
    <Link {...props} className={typeof className === "function" ? className(state) : className}>
      {typeof children === "function" ? children(state) : children}
    </Link>
  );
};

// Stories render without a router, so components fall back to plain anchors.
export const useInRouterContext = () => false;

export const useMatches = () => {
  const context = useContext(StorybookRouterContext);
  return [
    {
      id: "root",
      data: context.loaderData,
    },
  ];
};

const mockReactRouter = {
  useLoaderData,
  useRouteLoaderData,
  useFetcher,
  useNavigate,
  useLocation,
  useSearchParams,
  useRevalidator,
  useNavigation,
  useSubmit,
  Link,
  NavLink,
  useMatches,
  useInRouterContext,
  StorybookRouterContext,
};

export default mockReactRouter;
