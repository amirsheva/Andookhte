import { useEffect, useRef, useState } from 'react';

const easeOutExpo = (t: number): number => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * عدد را با انیمیشن نرم از مقدار قبلی به مقدار جدید می‌برد.
 * به‌روزرسانی وضعیت فقط داخل requestAnimationFrame انجام می‌شود.
 */
export function useAnimatedNumber(target: number, duration = 1100): number {
  const [display, setDisplay] = useState(target);
  /** آخرین مقدار نمایش‌داده‌شده — بیرون از چرخهٔ رندر نگه داشته می‌شود */
  const currentRef = useRef(target);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const from = currentRef.current;
    if (from === target) return;

    const commit = (value: number) => {
      currentRef.current = value;
      setDisplay(value);
    };

    if (prefersReducedMotion() || duration <= 0) {
      const id = requestAnimationFrame(() => commit(target));
      frameRef.current = id;
      return () => cancelAnimationFrame(id);
    }

    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      commit(from + (target - from) * easeOutExpo(progress));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);

  return display;
}
