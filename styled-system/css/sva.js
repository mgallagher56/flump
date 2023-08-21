import { getSlotRecipes } from '../helpers.js';
import { cva } from './cva.js';

export function sva(config) {
  const slots = Object.entries(getSlotRecipes(config)).map(([slot, slotCva]) => [slot, cva(slotCva)])
  
  function svaFn(props) {
    const result = slots.map(([slot, cvaFn]) => [slot, cvaFn(props)])
    return Object.fromEntries(result)
  }

  const [, firstCva] = slots[0]

  return Object.assign(svaFn, {
    __cva__: false,
    variantMap: firstCva.variantMap,
    variantKeys: firstCva.variantKeys,
    splitVariantProps: firstCva.splitVariantProps,
  })
}