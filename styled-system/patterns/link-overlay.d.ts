/* eslint-disable */
import type { Tokens } from '../tokens';
import type { ConditionalValue, SystemStyleObject } from '../types';
import type { Properties } from '../types/csstype';
import type { PropertyValue } from '../types/prop-type';

export type LinkOverlayProperties = {};

type LinkOverlayOptions = LinkOverlayProperties & Omit<SystemStyleObject, keyof LinkOverlayProperties>;

export declare function linkOverlay(options?: LinkOverlayOptions): string;
