/* eslint-disable */
import type { Tokens } from '../tokens';
import type { ConditionalValue, SystemStyleObject } from '../types';
import type { Properties } from '../types/csstype';
import type { PropertyValue } from '../types/prop-type';

export type LinkBoxProperties = {};

type LinkBoxOptions = LinkBoxProperties & Omit<SystemStyleObject, keyof LinkBoxProperties>;

export declare function linkBox(options?: LinkBoxOptions): string;
