import { useState, useEffect, useRef } from 'react';

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

export default function AnimatedNumber({ value, duration = 1000, format, className, style }) {
  const [display, setDisplay] = useState(0);
  const prevValue = useRef(0);
  const rafId = useRef(null);

  useEffect(() => {
    const start = prevValue.current;
    const end = typeof value === 'number' ? value : parseFloat(value) || 0;
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      const current = start + (end - start) * eased;

      setDisplay(current);

      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate);
      } else {
        prevValue.current = end;
      }
    };

    rafId.current = requestAnimationFrame(animate);
    return () => { if (rafId.current) cancelAnimationFrame(rafId.current); };
  }, [value, duration]);

  const formatted = format ? format(display) : display.toLocaleString();

  return <span className={className} style={style}>{formatted}</span>;
}
