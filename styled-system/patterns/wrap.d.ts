/* eslint-disable */
import type { Tokens } from '../tokens';
import type { ConditionalValue, SystemStyleObject } from '../types';
import type { Properties } from '../types/csstype';
import type { PropertyValue } from '../types/prop-type';

export type WrapProperties = {
  gap?: PropertyValue<'gap'>;
  rowGap?: PropertyValue<'gap'>;
  columnGap?: PropertyValue<'gap'>;
  align?: PropertyValue<'alignItems'>;
  justify?: PropertyValue<'justifyContent'>;
};

type WrapOptions = WrapProperties & Omit<SystemStyleObject, keyof WrapProperties>;

export declare function wrap(options?: WrapOptions): string;
