/* eslint-disable */
import type { Tokens } from '../tokens';
import type { ConditionalValue, SystemStyleObject } from '../types';
import type { Properties } from '../types/csstype';
import type { PropertyValue } from '../types/prop-type';

export type GridProperties = {
  gap?: PropertyValue<'gap'>;
  columnGap?: PropertyValue<'gap'>;
  rowGap?: PropertyValue<'gap'>;
  columns?: ConditionalValue<number>;
  minChildWidth?: ConditionalValue<Tokens['sizes'] | Properties['width']>;
};

type GridOptions = GridProperties & Omit<SystemStyleObject, keyof GridProperties>;

export declare function grid(options?: GridOptions): string;
