/* eslint-disable */
import type { Tokens } from '../tokens';
import type { ConditionalValue, SystemStyleObject } from '../types';
import type { Properties } from '../types/csstype';
import type { PropertyValue } from '../types/prop-type';

export type VstackProperties = {
  justify?: PropertyValue<'justifyContent'>;
  gap?: PropertyValue<'gap'>;
};

type VstackOptions = VstackProperties & Omit<SystemStyleObject, keyof VstackProperties>;

export declare function vstack(options?: VstackOptions): string;
