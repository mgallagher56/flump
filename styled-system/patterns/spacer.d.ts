/* eslint-disable */
import type { Tokens } from '../tokens';
import type { ConditionalValue, SystemStyleObject } from '../types';
import type { Properties } from '../types/csstype';
import type { PropertyValue } from '../types/prop-type';

export type SpacerProperties = {
  size?: ConditionalValue<Tokens['spacing']>;
};

type SpacerOptions = SpacerProperties & Omit<SystemStyleObject, keyof SpacerProperties>;

export declare function spacer(options?: SpacerOptions): string;
