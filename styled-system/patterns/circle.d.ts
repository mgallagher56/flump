/* eslint-disable */
import type { Tokens } from '../tokens';
import type { ConditionalValue, SystemStyleObject } from '../types';
import type { Properties } from '../types/csstype';
import type { PropertyValue } from '../types/prop-type';

export type CircleProperties = {
  size?: PropertyValue<'width'>;
};

type CircleOptions = CircleProperties & Omit<SystemStyleObject, keyof CircleProperties>;

export declare function circle(options?: CircleOptions): string;
