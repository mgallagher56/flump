import type { EmotionCache } from '@emotion/cache';
import createCache from '@emotion/cache';

export const defaultCache = createEmotionCache();

export default function createEmotionCache(): EmotionCache {
  return createCache({ key: 'cha' });
}
