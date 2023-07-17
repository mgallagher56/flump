/* eslint-disable */
import type { CompositionStyles } from './composition';
import type { Parts } from './parts';
import type { PatternConfig, PatternProperties } from './pattern';
import type { RecipeConfig, RecipeVariantRecord } from './recipe';
import type { GlobalStyleObject, SystemStyleObject } from './system-types';

declare module '@pandacss/dev' {
  export function defineRecipe<V extends RecipeVariantRecord>(config: RecipeConfig<V>): RecipeConfig;
  export function defineStyles(definition: SystemStyleObject): SystemStyleObject;
  export function defineGlobalStyles(definition: GlobalStyleObject): GlobalStyleObject;
  export function defineTextStyles(definition: CompositionStyles['textStyles']): CompositionStyles['textStyles'];
  export function defineLayerStyles(definition: CompositionStyles['layerStyles']): CompositionStyles['layerStyles'];
  export function definePattern<T extends PatternProperties>(config: PatternConfig<T>): PatternConfig;
  export function defineParts<T extends Parts>(
    parts: T
  ): (config: Partial<Record<keyof T, SystemStyleObject>>) => Partial<Record<keyof T, SystemStyleObject>>;
}
