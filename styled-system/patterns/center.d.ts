/* eslint-disable */
import type { Tokens } from '../tokens';
import type { ConditionalValue, SystemStyleObject } from '../types';
import type { Properties } from '../types/csstype';
import type { PropertyValue } from '../types/prop-type';

export type CenterProperties = {
  inline?: ConditionalValue<boolean>;
};

type CenterOptions = CenterProperties & Omit<SystemStyleObject, keyof CenterProperties>;

export declare function center(options?: CenterOptions): string;
