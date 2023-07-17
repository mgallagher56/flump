/* eslint-disable */
import type { Tokens } from '../tokens';
import type { ConditionalValue, SystemStyleObject } from '../types';
import type { Properties } from '../types/csstype';
import type { PropertyValue } from '../types/prop-type';

export type SquareProperties = {
  size?: PropertyValue<'width'>;
};

type SquareOptions = SquareProperties & Omit<SystemStyleObject, keyof SquareProperties>;

export declare function square(options?: SquareOptions): string;
