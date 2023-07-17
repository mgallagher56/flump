/* eslint-disable */
import type { Tokens } from '../tokens';
import type { ConditionalValue, SystemStyleObject } from '../types';
import type { Properties } from '../types/csstype';
import type { PropertyValue } from '../types/prop-type';

export type StackProperties = {
  align?: PropertyValue<'alignItems'>;
  justify?: PropertyValue<'justifyContent'>;
  direction?: PropertyValue<'flexDirection'>;
  gap?: PropertyValue<'gap'>;
};

type StackOptions = StackProperties & Omit<SystemStyleObject, keyof StackProperties>;

export declare function stack(options?: StackOptions): string;
