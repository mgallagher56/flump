import type { ReactNode } from 'react';

export interface TabData {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  value: string;
}
