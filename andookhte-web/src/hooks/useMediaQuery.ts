import { useCallback, useSyncExternalStore } from 'react';

/** وضعیت یک media query را بدون setState داخل افکت دنبال می‌کند */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** بازخورد لمسی کوتاه روی دستگاه‌های پشتیبان */
export const haptic = (pattern: number | number[] = 12): void => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* بی‌اهمیت */
    }
  }
};
