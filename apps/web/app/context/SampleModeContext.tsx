import { createContext, useContext } from "react";

/**
 * True inside the signed-out sandbox. Sandbox-only navigation (links into signed-in pages) reads
 * this to render as disabled "Sign up to open" instead of ending in a sign-in wall (IA review N-04).
 */
const SampleModeContext = createContext(false);

export const SampleModeProvider = SampleModeContext.Provider;

export const useSampleMode = (): boolean => useContext(SampleModeContext);
