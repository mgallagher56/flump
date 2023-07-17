/* eslint-disable */
import type { Tokens } from '../tokens';
import type { ConditionalValue, SystemStyleObject } from '../types';
import type { Properties } from '../types/csstype';
import type { PropertyValue } from '../types/prop-type';

export type HstackProperties = {
  justify?: PropertyValue<'justifyContent'>;
  gap?: PropertyValue<'gap'>;
};

type HstackOptions = HstackProperties & Omit<SystemStyleObject, keyof HstackProperties>;

export declare function hstack(options?: HstackOptions): string;
