// 役割: タスクを配置するボード領域（スクロールやパン操作、DnDターゲット）の提供

import { useEffect, useRef, useCallback, useState } from 'react';
import { useDroppable, useDndMonitor, useDndContext } from '@dnd-kit/core';
import { IconUndo, IconRedo, IconInputOutput, IconPlus } from './Icons';
import { usePanning } from '../hooks/usePanning';

export const InteractiveBoardArea = ({ children, activeTasks, onBoardClick, isMobile, isNarrowLayout, onShowAddModal, onShowIOModal, onUndo, onRedo, canUndo, canRedo }: any) => { 
  const { setNodeRef } = useDroppable({ id: 'root-board' });
  const { active } = useDndContext();
  const [isDragging, setIsDragging] = useState(false);
  const [insertIndicator, setInsertIndicator] = useState<{ left: number } | null>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  
  // ドラッグ中のタスクが存在しない場合は、確実にインジケーターとドラッグ状態をリセットする
  useEffect(() => {
    if (!active) {
      setIsDragging(false);
      setInsertIndicator(null);
    }
  }, [active]);

  useDndMonitor({ 
    onDragStart: () => setIsDragging(true), 
    onDragMove: (event) => {
        const { active, over } = event;
        if (over && over.id === 'root-board') {
            const activeIdStr = String(active.id);
            const rootTasks = activeTasks.filter((t: any) => t.id !== activeIdStr);
            const activeRect = active.rect.current.translated;
            if (activeRect && scrollRef.current) {
                const dropCenterX = activeRect.left + activeRect.width / 2;
                
                let insertIndex = rootTasks.length;
                for (let i = 0; i < rootTasks.length; i++) {
                    const el = document.querySelector(`[data-task-id="${rootTasks[i].id}"]`) as HTMLElement;
                    if (el) {
                        const rect = el.getBoundingClientRect();
                        const centerX = rect.left + rect.width / 2;
                        if (dropCenterX < centerX) {
                            insertIndex = i;
                            break;
                        }
                    }
                }

                let targetLeft = isMobile ? 8 : 16; // 初期位置(タスク0件の場合)

                if (insertIndex < rootTasks.length) {
                    const el = document.querySelector(`[data-task-id="${rootTasks[insertIndex].id}"]`) as HTMLElement;
                    if (el) {
                        targetLeft = el.offsetLeft - (isMobile ? 4 : 8); // gapの半分
                    }
                } else if (rootTasks.length > 0) {
                    // 末尾に挿入する場合
                    const el = document.querySelector(`[data-task-id="${rootTasks[rootTasks.length - 1].id}"]`) as HTMLElement;
                    if (el) {
                        targetLeft = el.offsetLeft + el.offsetWidth + (isMobile ? 4 : 8);
                    }
                }

                setInsertIndicator({ left: targetLeft });
            }
        } else {
            setInsertIndicator(null);
        }
    },
    onDragEnd: () => { setIsDragging(false); setInsertIndicator(null); }, 
    onDragCancel: () => { setIsDragging(false); setInsertIndicator(null); } 
  });
  
  const { scrollRef, isPanning, handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel, handleClick } = usePanning(isDragging, onBoardClick);
  const setRef = useCallback((node: HTMLDivElement | null) => { setNodeRef(node); scrollRef.current = node; }, [setNodeRef, scrollRef]);

  useEffect(() => {
    if (!isDragging || !isMobile) return;
    const updatePointer = (x: number, y: number) => { pointerRef.current = { x, y }; };
    const handleTouchMove = (e: TouchEvent) => { if (e.touches.length > 0) updatePointer(e.touches[0].clientX, e.touches[0].clientY); };
    const handlePointerMoveGlobal = (e: PointerEvent) => { updatePointer(e.clientX, e.clientY); };
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('pointermove', handlePointerMoveGlobal);
    let animationFrameId: number;
    const tick = () => {
      if (scrollRef.current) {
        const rect = scrollRef.current.getBoundingClientRect();
        const ratioX = (pointerRef.current.x - (rect.left + rect.width / 2)) / (rect.width / 2);
        const ratioY = (pointerRef.current.y - (rect.top + rect.height / 2)) / (rect.height / 2);
        if (Math.abs(ratioX) > 0.4) scrollRef.current.scrollLeft += Math.sign(ratioX) * ((Math.abs(ratioX) - 0.4) / 0.6) * 15;
        if (Math.abs(ratioY) > 0.4) scrollRef.current.scrollTop += Math.sign(ratioY) * ((Math.abs(ratioY) - 0.4) / 0.6) * 15;
      }
      animationFrameId = requestAnimationFrame(tick);
    };
    tick();
    return () => { window.removeEventListener('touchmove', handleTouchMove); window.removeEventListener('pointermove', handlePointerMoveGlobal); cancelAnimationFrame(animationFrameId); };
  }, [isDragging, isMobile]);

  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '200px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-surface)', transition: 'border 0.2s', overflow: 'hidden' }}>
      <div ref={setRef} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerCancel} onClick={handleClick} style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', display: 'flex', position: 'relative', gap: isMobile ? '8px' : '16px', alignItems: 'flex-start', padding: isMobile ? '8px' : '16px', paddingBottom: '240px', cursor: isPanning ? 'grabbing' : 'grab', userSelect: isPanning ? 'none' : 'auto' }}>
        {activeTasks.length === 0 ? <p style={{ color: 'var(--text-secondary)', margin: 'auto' }}>タスクを追加してください</p> : children}
        
        {/* rootTask 並び替え用の挿入位置インジケーター */}
        {insertIndicator && isDragging && active && (
          <div style={{
            position: 'absolute',
            left: insertIndicator.left,
            top: 0,
            bottom: 0,
            width: 0,
            borderLeft: '2px dashed var(--color-primary)',
            zIndex: 9999,
            pointerEvents: 'none'
          }}>
            {/* 上端の三角形（下向き） */}
            <div style={{ position: 'absolute', top: 0, left: -3, width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '6px solid var(--color-primary)' }} />
            {/* 下端の三角形（上向き） */}
            <div style={{ position: 'absolute', bottom: 0, left: -3, width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderBottom: '6px solid var(--color-primary)' }} />
          </div>
        )}
      </div>

      {isMobile && !isDragging && (
        <>
          <div style={{ position: 'absolute', bottom: '16px', left: '16px', display: 'flex', gap: '10px', zIndex: 100 }}>
            <button disabled={!canUndo} onClick={(e) => { e.stopPropagation(); onUndo(); }} style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(4px)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', cursor: canUndo ? 'pointer' : 'default', opacity: canUndo ? 1 : 0.4 }}><IconUndo size={20} /></button>
            <button disabled={!canRedo} onClick={(e) => { e.stopPropagation(); onRedo(); }} style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(4px)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', cursor: canRedo ? 'pointer' : 'default', opacity: canRedo ? 1 : 0.4 }}><IconRedo size={20} /></button>
          </div>
          <div style={{ position: 'absolute', bottom: '16px', right: '16px', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 100 }}>
            {isNarrowLayout && (
              <button onClick={(e) => { e.stopPropagation(); onShowIOModal(); }} style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.85, cursor: 'pointer' }}><IconInputOutput size={20} /></button>
            )}
            <button onClick={(e) => { e.stopPropagation(); onShowAddModal(); }} style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.85, cursor: 'pointer' }}><IconPlus size={28} /></button>
          </div>
        </>
      )}
    </div>
  );
};

export const StaticBoardArea = ({ children, activeTasks, onBoardClick, isMobile, isNarrowLayout, onShowIOModal, onUndo, onRedo, canUndo, canRedo }: any) => { 
  const { scrollRef, isPanning, handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel, handleClick } = usePanning(false, onBoardClick);

  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '200px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-surface)', transition: 'border 0.2s', overflow: 'hidden' }}>
      <div ref={scrollRef} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerCancel} onClick={handleClick} style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', display: 'flex', position: 'relative', gap: isMobile ? '8px' : '16px', alignItems: 'flex-start', padding: isMobile ? '8px' : '16px', paddingBottom: '240px', cursor: isPanning ? 'grabbing' : 'grab', userSelect: isPanning ? 'none' : 'auto' }}>
        {activeTasks.length === 0 ? <p style={{ color: 'var(--text-secondary)', margin: 'auto' }}>タスクがありません</p> : children}
      </div>
      {isMobile && (
        <>
          <div style={{ position: 'absolute', bottom: '16px', left: '16px', display: 'flex', gap: '10px', zIndex: 100 }}>
            <button disabled={!canUndo} onClick={(e) => { e.stopPropagation(); onUndo(); }} style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(4px)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', cursor: canUndo ? 'pointer' : 'default', opacity: canUndo ? 1 : 0.4 }}><IconUndo size={20} /></button>
            <button disabled={!canRedo} onClick={(e) => { e.stopPropagation(); onRedo(); }} style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(4px)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', cursor: canRedo ? 'pointer' : 'default', opacity: canRedo ? 1 : 0.4 }}><IconRedo size={20} /></button>
          </div>
          {isNarrowLayout && (
            <div style={{ position: 'absolute', bottom: '16px', right: '16px', display: 'flex', alignItems: 'center', zIndex: 100 }}>
              <button onClick={(e) => { e.stopPropagation(); onShowIOModal(); }} style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.85, cursor: 'pointer' }}><IconInputOutput size={20} /></button>
            </div>
          )}
        </>
      )}
    </div>
  );
};