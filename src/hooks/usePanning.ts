// 役割: ボードエリアをドラッグ・スワイプでスクロールするための状態・イベント管理

import { useState, useCallback, useRef } from 'react';

export function usePanning(isDragging: boolean, onBoardClick: () => void) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [scrollPos, setScrollPos] = useState({ left: 0, top: 0 });
  const hasMovedRef = useRef(false);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => { 
    if (isDragging || e.button !== 0) return; 
    if ((e.target as Element).closest('[data-task-id]')) return; 
    setIsPanning(true); 
    hasMovedRef.current = false; 
    setStartPos({ x: e.clientX, y: e.clientY }); 
    if (scrollRef.current) setScrollPos({ left: scrollRef.current.scrollLeft, top: scrollRef.current.scrollTop }); 
    (e.target as Element).setPointerCapture(e.pointerId); 
  }, [isDragging]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => { 
    if (!isPanning || !scrollRef.current) return; 
    const dx = e.clientX - startPos.x; 
    const dy = e.clientY - startPos.y; 
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMovedRef.current = true; 
    scrollRef.current.scrollLeft = scrollPos.left - dx; 
    scrollRef.current.scrollTop = scrollPos.top - dy; 
  }, [isPanning, startPos, scrollPos]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => { 
    if (!isPanning) return; 
    setIsPanning(false); 
    (e.target as Element).releasePointerCapture(e.pointerId); 
  }, [isPanning]);

  const handlePointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => { 
    if (!isPanning) return; 
    setIsPanning(false); 
    (e.target as Element).releasePointerCapture(e.pointerId); 
  }, [isPanning]);

  const handleClick = useCallback(() => {
    if (!hasMovedRef.current) onBoardClick();
  }, [onBoardClick]);

  return { scrollRef, isPanning, handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel, handleClick };
}