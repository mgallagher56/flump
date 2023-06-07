import type { ReactNode } from 'react';

export interface TabData {
  content: ReactNode;
  isDisabled?: boolean;
  label: string;
  value: string;
}
