import { useEffect, useRef, useState } from 'react';

/** Cuenta desde 0 (o el valor anterior) hasta el valor final en ~0,8 s. */
export function AnimatedNumber({
  value,
  duration = 800,
}: {
  value: number;
  duration?: number;
}) {
  const [shown, setShown] = useState(value);
  const from = useRef(0);

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof requestAnimationFrame !== 'function') {
      setShown(value);
      return;
    }
    const start = performance.now();
    const initial = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setShown(Math.round(initial + (value - initial) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <>{shown.toLocaleString('es-CO')}</>;
}
