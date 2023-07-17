/* eslint-disable */
import type { Tokens } from '../tokens';
import type { ConditionalValue, SystemStyleObject } from '../types';
import type { Properties } from '../types/csstype';
import type { PropertyValue } from '../types/prop-type';

export type ContainerProperties = {};

type ContainerOptions = ContainerProperties & Omit<SystemStyleObject, keyof ContainerProperties>;

export declare function container(options?: ContainerOptions): string;
