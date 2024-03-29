/* eslint-disable */
import type { ComponentProps, ElementType } from 'react';

import type { RecipeDefinition, RecipeSelection, RecipeVariantRecord } from './recipe';
import type { Assign, JsxHTMLProps, JsxStyleProps } from './system-types';

type Dict = Record<string, unknown>;

export type StyledComponent<T extends ElementType, P extends Dict = {}> = {
  (props: JsxHTMLProps<ComponentProps<T>, Assign<JsxStyleProps, P>>): JSX.Element;
  displayName?: string;
};

type RecipeFn = { __type: any };

interface JsxFactory {
  <T extends ElementType>(component: T): StyledComponent<T, {}>;
  <T extends ElementType, P extends RecipeVariantRecord>(
    component: T,
    recipe: RecipeDefinition<P>
  ): StyledComponent<T, RecipeSelection<P>>;
  <T extends ElementType, P extends RecipeFn>(component: T, recipeFn: P): StyledComponent<T, P['__type']>;
}

type JsxElements = { [K in keyof JSX.IntrinsicElements]: StyledComponent<K, {}> };

export type Styled = JsxFactory & JsxElements;

export type HTMLStyledProps<T extends ElementType> = JsxHTMLProps<ComponentProps<T>, JsxStyleProps>;
