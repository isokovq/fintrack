import { useState, useRef } from 'react';
import { Trash2 } from 'lucide-react';

export default function SwipeRow({ children, onDelete, confirmText = 'Delete?' }) {
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const locked = useRef(false);

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    locked.current = false;
    setSwiping(true);
  };

  const handleTouchMove = (e) => {
    if (!swiping) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    // If vertical scroll is dominant, don't swipe
    if (!locked.current && Math.abs(dy) > Math.abs(dx)) {
      setSwiping(false);
      return;
    }
    locked.current = true;

    if (dx < 0) {
      setOffset(Math.max(-80, dx));
    }
  };

  const handleTouchEnd = () => {
    setSwiping(false);
    if (offset < -40) {
      setOffset(-80);
    } else {
      setOffset(0);
    }
  };

  const handleDelete = () => {
    if (window.confirm(confirmText)) {
      setOffset(-200);
      setTimeout(() => onDelete(), 200);
    } else {
      setOffset(0);
    }
  };

  return (
    <div className="swipe-row-container" style={{ overflow: 'hidden', position: 'relative' }}>
      <div
        className="swipe-delete-bg"
        style={{ opacity: offset < -10 ? 1 : 0 }}
        onClick={handleDelete}
      >
        <Trash2 size={16} color="white" />
      </div>
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping ? 'none' : 'transform 0.25s ease',
          position: 'relative',
          zIndex: 1,
          background: 'var(--bg-surface)',
        }}
        onClick={() => offset !== 0 && setOffset(0)}
      >
        {children}
      </div>
    </div>
  );
}
