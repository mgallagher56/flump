/* eslint-disable */
import type { Tokens } from '../tokens';
import type { ConditionalValue, SystemStyleObject } from '../types';
import type { Properties } from '../types/csstype';
import type { PropertyValue } from '../types/prop-type';

export type FlexProperties = {
  align?: PropertyValue<'alignItems'>;
  justify?: PropertyValue<'justifyContent'>;
  direction?: PropertyValue<'flexDirection'>;
  wrap?: PropertyValue<'flexWrap'>;
  basis?: PropertyValue<'flexBasis'>;
  grow?: PropertyValue<'flexGrow'>;
  shrink?: PropertyValue<'flexShrink'>;
};

type FlexOptions = FlexProperties & Omit<SystemStyleObject, keyof FlexProperties>;

export declare function flex(options?: FlexOptions): string;
