/* eslint-disable */
import type { Tokens } from '../tokens';
import type { ConditionalValue, SystemStyleObject } from '../types';
import type { Properties } from '../types/csstype';
import type { PropertyValue } from '../types/prop-type';

export type GridItemProperties = {
  colSpan?: ConditionalValue<number>;
  rowSpan?: ConditionalValue<number>;
  colStart?: ConditionalValue<number>;
  rowStart?: ConditionalValue<number>;
  colEnd?: ConditionalValue<number>;
  rowEnd?: ConditionalValue<number>;
};

type GridItemOptions = GridItemProperties & Omit<SystemStyleObject, keyof GridItemProperties>;

export declare function gridItem(options?: GridItemOptions): string;
