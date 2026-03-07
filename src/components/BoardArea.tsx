// src/components/BoardArea.tsx
// 役割: タスクを配置するメインのボードエリアのレンダリングとドラッグ時のスクロール・位置計算
// なぜ: タスクのドラッグ＆ドロップ時に視覚的なフィードバックと挿入位置の表示を提供するため

import { useEffect, useRef, useCallback, useState } from 'react';
import { useDroppable, useDndMonitor, useDndContext } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import { IconUndo, IconRedo, IconInputOutput, IconPlus } from './Icons';
import { usePanning } from '../hooks/usePanning';

export const InteractiveBoardArea = ({ children, activeTasks, onBoardClick, isMobile, isNarrowLayout, onShowAddModal, onShowIOModal, onUndo, onRedo, canUndo, canRedo, boardLayout = 'horizontal' }: any) => { 
  const { t } = useTranslation();
  const { setNodeRef } = useDroppable({ id: 'root-board' });
  const { active } = useDndContext();
  const [isDragging, setIsDragging] = useState(false);
  const [insertIndicator, setInsertIndicator] = useState<{ left?: number, top?: number } | null>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  
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
            
            // なぜ: ルートタスクのみを抽出し、元の配列上のインデックスを把握するため
            const allRootTasks = activeTasks.filter((t: any) => !t.parentId).sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
            const originalIndex = allRootTasks.findIndex((t: any) => t.id === activeIdStr);
            const rootTasks = allRootTasks.filter((t: any) => t.id !== activeIdStr);
            
            const activeRect = active.rect.current.translated;
            const container = scrollRef.current;

            if (activeRect && container) {
                const containerRect = container.getBoundingClientRect();
                let found = false;
                let insertIndex = rootTasks.length; // 初期値は末尾

                if (boardLayout === 'vertical') {
                    const dropCenterY = activeRect.top + activeRect.height / 2;
                    const sortedElements = rootTasks.map((t: any) => {
                        const el = document.querySelector(`[data-task-id="${t.id}"]`) as HTMLElement;
                        return { id: t.id, rect: el ? el.getBoundingClientRect() : null };
                    }).filter((item: any) => item.rect !== null).sort((a: any, b: any) => a.rect.top - b.rect.top);

                    let targetTop = isMobile ? 8 : 16;
                    for (let i = 0; i < sortedElements.length; i++) {
                        const item = sortedElements[i];
                        const centerY = item.rect.top + item.rect.height / 2;
                        if (dropCenterY < centerY) {
                            targetTop = item.rect.top - containerRect.top + container.scrollTop - 16;
                            insertIndex = i;
                            found = true;
                            break;
                        }
                    }
                    if (!found && sortedElements.length > 0) {
                        const lastItem = sortedElements[sortedElements.length - 1];
                        targetTop = lastItem.rect.bottom - containerRect.top + container.scrollTop + 16;
                    }
                    
                    // なぜ: 元の並び順と変わらない場合はインジケーターを表示させないため
                    if (insertIndex === originalIndex) {
                        setInsertIndicator(null);
                    } else {
                        setInsertIndicator({ top: targetTop });
                    }
                } else {
                    const dropCenterX = activeRect.left + activeRect.width / 2;
                    const sortedElements = rootTasks.map((t: any) => {
                        const el = document.querySelector(`[data-task-id="${t.id}"]`) as HTMLElement;
                        return { id: t.id, rect: el ? el.getBoundingClientRect() : null };
                    }).filter((item: any) => item.rect !== null).sort((a: any, b: any) => a.rect.left - b.rect.left);

                    let targetLeft = isMobile ? 8 : 16;
                    for (let i = 0; i < sortedElements.length; i++) {
                        const item = sortedElements[i];
                        const centerX = item.rect.left + item.rect.width / 2;
                        if (dropCenterX < centerX) {
                            targetLeft = item.rect.left - containerRect.left + container.scrollLeft - (isMobile ? 4 : 8);
                            insertIndex = i;
                            found = true;
                            break;
                        }
                    }
                    if (!found && sortedElements.length > 0) {
                        const lastItem = sortedElements[sortedElements.length - 1];
                        targetLeft = lastItem.rect.right - containerRect.left + container.scrollLeft + (isMobile ? 4 : 8);
                    }
                    
                    // なぜ: 元の並び順と変わらない場合はインジケーターを表示させないため
                    if (insertIndex === originalIndex) {
                        setInsertIndicator(null);
                    } else {
                        setInsertIndicator({ left: targetLeft });
                    }
                }
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
      <div ref={setRef} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerCancel} onClick={handleClick} 
           style={{ 
             flex: 1, overflowX: 'auto', overflowY: 'auto', display: 'flex', 
             flexDirection: boardLayout === 'vertical' ? 'column' : 'row', 
             position: 'relative', 
             gap: boardLayout === 'vertical' ? '32px' : (isMobile ? '8px' : '16px'), 
             alignItems: boardLayout === 'vertical' ? (isMobile ? 'stretch' : 'flex-start') : 'flex-start', 
             paddingTop: isMobile ? '8px' : '16px', 
             paddingBottom: boardLayout === 'vertical' ? '400px' : '240px',
             paddingLeft: boardLayout === 'horizontal' ? (isMobile ? '24px' : '32px') : (isMobile ? '8px' : '16px'),
             paddingRight: boardLayout === 'horizontal' ? (isMobile ? '24px' : '32px') : (isMobile ? '8px' : '16px'),
             cursor: isPanning ? 'grabbing' : 'grab', 
             userSelect: isPanning ? 'none' : 'auto' 
           }}>
        
        {activeTasks.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', margin: 'auto' }}>{t('please_add_task')}</p>
        ) : (
          <>
            {children}
            {boardLayout === 'horizontal' && <div style={{ minWidth: isMobile ? '32px' : '64px', height: '1px', flexShrink: 0, pointerEvents: 'none' }} />}
          </>
        )}
        
        {insertIndicator && isDragging && active && (
          insertIndicator.left !== undefined ? (
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
              <div style={{ position: 'absolute', top: 0, left: -3, width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '6px solid var(--color-primary)' }} />
              <div style={{ position: 'absolute', bottom: 0, left: -3, width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderBottom: '6px solid var(--color-primary)' }} />
            </div>
          ) : (
            <div style={{
              position: 'absolute',
              top: insertIndicator.top,
              left: 0,
              right: 0,
              height: 0,
              borderTop: '2px dashed var(--color-primary)',
              zIndex: 9999,
              pointerEvents: 'none'
            }}>
              <div style={{ position: 'absolute', left: 0, top: -3, width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: '6px solid var(--color-primary)' }} />
              <div style={{ position: 'absolute', right: 0, top: -3, width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderRight: '6px solid var(--color-primary)' }} />
            </div>
          )
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

export const StaticBoardArea = ({ children, activeTasks, onBoardClick, isMobile, isNarrowLayout, onShowIOModal, onUndo, onRedo, canUndo, canRedo, boardLayout = 'horizontal' }: any) => { 
  const { t } = useTranslation();
  const { scrollRef, isPanning, handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel, handleClick } = usePanning(false, onBoardClick);

  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '200px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-surface)', transition: 'border 0.2s', overflow: 'hidden' }}>
      <div ref={scrollRef} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerCancel} onClick={handleClick} 
           style={{ 
             flex: 1, overflowX: 'auto', overflowY: 'auto', display: 'flex', 
             flexDirection: boardLayout === 'vertical' ? 'column' : 'row', 
             position: 'relative', 
             gap: boardLayout === 'vertical' ? '32px' : (isMobile ? '8px' : '16px'), 
             alignItems: boardLayout === 'vertical' ? (isMobile ? 'stretch' : 'flex-start') : 'flex-start', 
             paddingTop: isMobile ? '8px' : '16px', 
             paddingBottom: boardLayout === 'vertical' ? '400px' : '240px',
             paddingLeft: boardLayout === 'horizontal' ? (isMobile ? '24px' : '32px') : (isMobile ? '8px' : '16px'),
             paddingRight: boardLayout === 'horizontal' ? (isMobile ? '24px' : '32px') : (isMobile ? '8px' : '16px'),
             cursor: isPanning ? 'grabbing' : 'grab', 
             userSelect: isPanning ? 'none' : 'auto' 
           }}>
           
        {activeTasks.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', margin: 'auto' }}>{t('no_tasks')}</p>
        ) : (
          <>
            {children}
            {boardLayout === 'horizontal' && <div style={{ minWidth: isMobile ? '32px' : '64px', height: '1px', flexShrink: 0, pointerEvents: 'none' }} />}
          </>
        )}
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