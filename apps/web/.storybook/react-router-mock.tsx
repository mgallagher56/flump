import { createContext, type ReactElement, type ReactNode, useContext } from "react";

export interface MockRouterContextType {
  loaderData: any;
  fetcher: {
    submit: (target: any, options?: any) => void;
    state: "idle" | "submitting" | "loading";
    Form: (props: { children: ReactNode; [key: string]: any }) => ReactElement;
  };
  navigate: (to: string, options?: any) => void;
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

export const useLocation = () => {
  const context = useContext(StorybookRouterContext);
  return context.location || { pathname: "/", search: "", hash: "", state: null, key: "default" };
};

export const useSearchParams = () => {
  const [params, setParams] = [new URLSearchParams(), () => {}];
  return [params, setParams] as const;
};

export const useRevalidator = () => {
  return { revalidate: () => {}, state: "idle" as const };
};

export const useNavigation = () => {
  return { state: "idle" as const, location: undefined };
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

export const NavLink = Link;

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
  StorybookRouterContext,
};

export default mockReactRouter;
