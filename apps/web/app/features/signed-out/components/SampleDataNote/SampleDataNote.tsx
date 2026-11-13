import { Icon } from "@repo/ui";
import { Info } from "lucide-react";
import type { FC, ReactNode } from "react";
import { sampleNote } from "./SampleDataNote.styles";

export interface SampleDataNoteProps {
  /** DOM id, so a page can point `aria-describedby` at the note. */
  id?: string;
  children: ReactNode;
}

/** Quiet cue that the figures shown are sample or illustrative, not the visitor's own. */
export const SampleDataNote: FC<SampleDataNoteProps> = ({ id, children }) => (
  <p className={sampleNote()} id={id}>
    <Icon icon={Info} size="sm" />
    <span>{children}</span>
  </p>
);

export default SampleDataNote;
