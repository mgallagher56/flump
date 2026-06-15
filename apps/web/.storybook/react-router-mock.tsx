import { createContext, type ReactElement, type ReactNode, useContext } from "react";

export interface MockRouterContextType {
  loaderData: any;
  fetcher: {
    submit: (target: any, options?: any) => void;
    state: "idle" | "submitting" | "loading";
    Form: (props: { children: ReactNode; [key: string]: any }) => ReactElement;
  };
  navigate: (to: string, options?: any) => void;
}

export const StorybookRouterContext = createContext<MockRouterContextType>({
  loaderData: {},
  fetcher: {
    submit: () => {},
    state: "idle",
    Form: ({ children, ...props }) => <form {...props}>{children}</form>,
  },
  navigate: () => {},
});

export const useLoaderData = () => {
  const context = useContext(StorybookRouterContext);
  return context.loaderData;
};

export const useFetcher = () => {
  const context = useContext(StorybookRouterContext);
  return context.fetcher;
};

export const useNavigate = () => {
  const context = useContext(StorybookRouterContext);
  return context.navigate;
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
  useFetcher,
  useNavigate,
  Link,
  NavLink,
  useMatches,
  StorybookRouterContext,
};

export default mockReactRouter;
