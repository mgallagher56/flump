/* eslint-disable */
import type { Tokens } from '../tokens';
import type { ConditionalValue, SystemStyleObject } from '../types';
import type { Properties } from '../types/csstype';
import type { PropertyValue } from '../types/prop-type';

export type BoxProperties = {};

type BoxOptions = BoxProperties & Omit<SystemStyleObject, keyof BoxProperties>;

export declare function box(options?: BoxOptions): string;
