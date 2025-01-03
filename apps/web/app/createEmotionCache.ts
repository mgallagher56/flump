import createCache, { type EmotionCache } from '@emotion/cache';

export const defaultCache = createEmotionCache();

export default function createEmotionCache(): EmotionCache {
  return createCache({ key: 'css' });
}
