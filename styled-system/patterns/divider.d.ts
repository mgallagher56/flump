/* eslint-disable */
import type { Tokens } from '../tokens';
import type { ConditionalValue, SystemStyleObject } from '../types';
import type { Properties } from '../types/csstype';
import type { PropertyValue } from '../types/prop-type';

export type DividerProperties = {
  orientation?: ConditionalValue<'horizontal' | 'vertical'>;
  thickness?: ConditionalValue<Tokens['sizes'] | Properties['borderWidth']>;
  color?: ConditionalValue<Tokens['colors'] | Properties['borderColor']>;
};

type DividerOptions = DividerProperties & Omit<SystemStyleObject, keyof DividerProperties>;

export declare function divider(options?: DividerOptions): string;
