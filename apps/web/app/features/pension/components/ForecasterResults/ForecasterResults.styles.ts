import { cva } from "@repo/ui/styled-system/css";

/** Keeps the neutral badge on the note's first line, beside its sentence. */
export const allowanceBadge = cva({ base: { verticalAlign: "middle" } });
