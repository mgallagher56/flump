/**
 * Hands the app's one API client and query client to screens (O5 seam 2: screens reach data only
 * through `src/data`). The client is null in a misconfigured build or before sign-in exists; a
 * data hook then reports an error instead of calling anything.
 */
import type { ApiClient } from "@flump/api-client";
import { focusManager, type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext, useEffect } from "react";
import { AppState } from "react-native";

const ApiContext = createContext<ApiClient | null>(null);

export function ApiProvider({
  client,
  queryClient,
  signedIn = true,
  children,
}: {
  client: ApiClient | null;
  queryClient: QueryClient;
  /** False once nobody is signed in: every cached answer is dropped from memory (plan 5.2). */
  signedIn?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!signedIn) queryClient.clear();
  }, [signedIn, queryClient]);
  // Back in the foreground counts as focus: stale reads are fetched again, and screens that read
  // today's date (the check-in row) render again with it.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      focusManager.setFocused(state === "active");
    });
    return () => sub.remove();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <ApiContext.Provider value={client}>{children}</ApiContext.Provider>
    </QueryClientProvider>
  );
}

export function useApi(): ApiClient | null {
  return useContext(ApiContext);
}
