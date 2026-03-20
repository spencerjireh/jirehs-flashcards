import { useRef, useCallback, useEffect, useState } from 'react';

interface PanState {
  x: number;
  y: number;
}

interface UsePannableOptions {
  initialX?: number;
  initialY?: number;
  decay?: number;
}

export function usePannable(options: UsePannableOptions = {}) {
  const { initialX = 0, initialY = 0, decay = 0.95 } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  const [pan, setPan] = useState<PanState>({ x: initialX, y: initialY });
  const [dragging, setDragging] = useState(false);

  const panRef = useRef(pan);
  panRef.current = pan;

  const dragState = useRef({
    active: false,
    startX: 0,
    startY: 0,
    panStartX: 0,
    panStartY: 0,
    velocityX: 0,
    velocityY: 0,
    lastX: 0,
    lastY: 0,
    lastTime: 0,
    momentumFrame: 0,
  });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Don't pan when clicking on interactive elements
      if ((e.target as HTMLElement).closest('[data-stack]')) return;

      const ds = dragState.current;
      ds.active = true;
      ds.startX = e.clientX;
      ds.startY = e.clientY;
      ds.panStartX = panRef.current.x;
      ds.panStartY = panRef.current.y;
      ds.lastX = e.clientX;
      ds.lastY = e.clientY;
      ds.lastTime = Date.now();
      ds.velocityX = 0;
      ds.velocityY = 0;

      if (ds.momentumFrame) {
        cancelAnimationFrame(ds.momentumFrame);
        ds.momentumFrame = 0;
      }

      setDragging(true);

      if (surfaceRef.current) {
        surfaceRef.current.style.transition = 'none';
      }
    },
    []
  );

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      const ds = dragState.current;
      if (!ds.active) return;

      const dx = e.clientX - ds.startX;
      const dy = e.clientY - ds.startY;
      const newX = ds.panStartX + dx;
      const newY = ds.panStartY + dy;
      setPan({ x: newX, y: newY });

      const now = Date.now();
      const dt = now - ds.lastTime;
      if (dt > 0) {
        ds.velocityX = ((e.clientX - ds.lastX) / dt) * 16;
        ds.velocityY = ((e.clientY - ds.lastY) / dt) * 16;
      }
      ds.lastX = e.clientX;
      ds.lastY = e.clientY;
      ds.lastTime = now;
    }

    function handleMouseUp() {
      const ds = dragState.current;
      if (!ds.active) return;
      ds.active = false;
      setDragging(false);

      if (surfaceRef.current) {
        surfaceRef.current.style.transition = 'transform 0.08s linear';
      }

      // Apply momentum
      if (Math.abs(ds.velocityX) > 0.5 || Math.abs(ds.velocityY) > 0.5) {
        function momentum() {
          ds.velocityX *= decay;
          ds.velocityY *= decay;
          if (Math.abs(ds.velocityX) < 0.1 && Math.abs(ds.velocityY) < 0.1) {
            ds.momentumFrame = 0;
            return;
          }
          setPan((prev) => ({
            x: prev.x + ds.velocityX,
            y: prev.y + ds.velocityY,
          }));
          ds.momentumFrame = requestAnimationFrame(momentum);
        }
        ds.momentumFrame = requestAnimationFrame(momentum);
      }
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (dragState.current.momentumFrame) {
        cancelAnimationFrame(dragState.current.momentumFrame);
      }
    };
  }, [decay]);

  const surfaceStyle: React.CSSProperties = {
    transform: `translate(${pan.x}px, ${pan.y}px)`,
  };

  const panTo = useCallback((x: number, y: number) => {
    if (surfaceRef.current) {
      surfaceRef.current.style.transition = 'transform 0.4s var(--ease-out)';
    }
    setPan({ x, y });
  }, []);

  return {
    containerRef,
    surfaceRef,
    surfaceStyle,
    handleMouseDown,
    dragging,
    panTo,
  };
}
