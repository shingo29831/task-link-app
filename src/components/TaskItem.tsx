// 役割: 個別のタスクを表示し、ステータス変更やドラッグ＆ドロップのターゲットとなるUIコンポーネント
// なぜ: タスクの階層構造を視覚的に表現し、各タスクに対する直接的な操作を提供するため

import React, { useState, useMemo } from 'react';
import { format, differenceInCalendarDays } from 'date-fns';
import { useDroppable, useDndContext, useDndMonitor } from '@dnd-kit/core'; 
import { useResponsive } from '../hooks/useResponsive';
import type { Task } from '../types';
import { IconCalendar, IconX, IconChevronDown, IconChevronRight } from './Icons';

type TaskNode = Task & { children: TaskNode[] };

interface Props {
  task: Task;
  tasks: Task[]; 
  depth: number;
  hasChildren: boolean;
  onStatusChange: (s: 0 | 1 | 2 | 3) => void;
  onParentStatusChange: (id: string, s: 0 | 1 | 2 | 3) => void;
  onDelete: () => void;
  onDeadlineChange: (dateStr: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onClick: () => void;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  isActiveParent?: boolean;
  isViewer?: boolean;
  onEditModalOpen?: () => void;
}

// DnDが有効な場合のみマウントされるネスト用ドロップエリア
const NestDroppableInner: React.FC<{ task: Task, tasks: Task[], depth: number }> = ({ task, tasks}) => {
  const { active } = useDndContext(); 
  const isDropDisabled = (() => {
    if (!active) return false;
    const activeId = String(active.id);
    if (activeId === task.id) return true;
    let current = task;
    while (current.parentId) {
      if (current.parentId === activeId) return true;
      const parent = tasks.find(t => t.id === current.parentId);
      if (!parent) break;
      current = parent;
    }
    return false;
  })();

  const { setNodeRef, isOver } = useDroppable({
    id: `nest-${task.id}`,
    data: { type: 'nest', task },
    disabled: isDropDisabled
  });

  return (
    <>
      {isOver && !isDropDisabled && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: '2px dashed var(--color-primary)', boxSizing: 'border-box', pointerEvents: 'none', zIndex: 20, borderRadius: '4px' }} />
      )}
      <div ref={setNodeRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }} />
    </>
  );
};

export const TaskItem: React.FC<Props> = ({ 
  task, tasks, depth, hasChildren, 
  onStatusChange, onParentStatusChange, onDelete, onDeadlineChange,
  isExpanded, onToggleExpand, onClick,
  isMenuOpen, onToggleMenu,
  isActiveParent = false,
  isViewer = false,
  onEditModalOpen
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [isEditingDeadline, setIsEditingDeadline] = useState(false);
  const [insertPosition, setInsertPosition] = useState<'top' | 'bottom' | null>(null);

  const { windowWidth, isMobile } = useResponsive();

  const { fontSize, indentWidth, itemPadding, buttonPadding, buttonFontSize } = useMemo(() => {
    if (windowWidth <= 480) {
        return { fontSize: '13px', indentWidth: 12, itemPadding: '8px 0', buttonPadding: '4px 8px', buttonFontSize: '0.8em' };
    } else if (windowWidth <= 768) {
        return { fontSize: '14px', indentWidth: 16, itemPadding: '8px 0', buttonPadding: '4px 10px', buttonFontSize: '0.85em' };
    } else if (windowWidth < 1280) {
        return { fontSize: '15px', indentWidth: 20, itemPadding: '8px 0', buttonPadding: '4px 10px', buttonFontSize: '0.85em' };
    }
    return { fontSize: '16px', indentWidth: 24, itemPadding: '10px 0', buttonPadding: '4px 12px', buttonFontSize: '0.85em' };
  }, [windowWidth]);

  // 並び替え位置を示すインジケーターの制御
  useDndMonitor({
    onDragMove: (event) => {
      const { active, over } = event;
      if (over?.id === task.id && active.id !== task.id) {
        const activeRect = active.rect.current.translated;
        const targetElement = document.querySelector(`[data-task-id="${task.id}"]`);
        if (targetElement && activeRect) {
            const rect = targetElement.getBoundingClientRect();
            const activeCenterY = activeRect.top + activeRect.height / 2;
            const targetCenterY = rect.top + rect.height / 2;
            const newPos = activeCenterY > targetCenterY ? 'bottom' : 'top';
            setInsertPosition(prev => prev !== newPos ? newPos : prev);
        }
      } else {
        setInsertPosition(prev => prev !== null ? null : prev);
      }
    },
    onDragEnd: () => setInsertPosition(null),
    onDragCancel: () => setInsertPosition(null),
  });

  const config = { 
    0: { l: '未着手', c: 'var(--text-placeholder)' },
    1: { l: '進行中', c: 'var(--color-info)' }, 
    2: { l: '完了', c: 'var(--color-success)' }, 
    3: { l: '休止', c: 'var(--color-suspend)' } 
  }[task.status] as any;

  const currentDeadlineStr = task.deadline !== undefined ? format(task.deadline, 'yyyy-MM-dd') : '';
  const daysRemaining = task.deadline !== undefined ? differenceInCalendarDays(task.deadline, new Date()) : null;
    
  const isUrgent = useMemo(() => {
    const checkRecursive = (t: Task): boolean => {
        if (t.status !== 2 && t.deadline !== undefined) {
            const diff = differenceInCalendarDays(t.deadline, new Date());
            if (diff <= 1) return true;
        }
        const children = tasks.filter(c => !c.isDeleted && c.parentId === t.id);
        return children.some(checkRecursive);
    };
    return checkRecursive(task);
  }, [task, tasks]);

  const getDeadline = () => {
    if (daysRemaining === null) return null;
    let color = 'var(--text-placeholder)';
    if (daysRemaining < 0) color = 'var(--color-danger)';
    else if (daysRemaining === 0) color = 'var(--color-warning)';
    let label = daysRemaining < 0 ? `${Math.abs(daysRemaining)}日超過` : daysRemaining === 0 ? '今日まで' : `あと${daysRemaining}日`;
    return <span style={{ color, fontSize: '0.85em', marginLeft: '6px', whiteSpace: 'nowrap' }}>{label}</span>;
  };

  const calculateProgress = (): number | null => {
    const node = task as unknown as TaskNode;
    if (!node.children || node.children.length === 0) return null;
    let total = 0, count = 0;
    const traverse = (n: TaskNode) => {
      if (!n.children || n.children.length === 0) {
        total += n.status === 2 ? 100 : n.status === 1 ? 50 : 0;
        count++;
      } else { n.children.forEach(traverse); }
    };
    node.children.forEach(traverse);
    if (count === 0) return null;
    return Math.round(total / count);
  };

  const getProgressData = () => {
    const node = task as unknown as TaskNode;
    if (!node.children || node.children.length === 0) return { p0: 0, p1: 0, p2: 0, p3: 0 };
    const counts = { 0: 0, 1: 0, 2: 0, 3: 0 };
    let total = 0;
    const traverse = (n: TaskNode) => {
      if (!n.children || n.children.length === 0) {
        counts[n.status as 0|1|2|3]++;
        total++;
      } else {
        n.children.forEach(traverse);
      }
    };
    node.children.forEach(traverse);
    if (total === 0) return { p0: 0, p1: 0, p2: 0, p3: 0 };

    return {
      p2: (counts[2] / total) * 100, // 完了
      p1: (counts[1] / total) * 100, // 進行中
      p0: (counts[0] / total) * 100, // 未着手
      p3: (counts[3] / total) * 100  // 休止
    };
  };

  const progress = hasChildren ? calculateProgress() : null;

  const handleItemClick = () => {
      if (isEditingDeadline) return;
      onClick();
      if (!isMenuOpen) { onToggleMenu(); }
  };

  const stopPropagation = (e: React.PointerEvent | React.MouseEvent) => { e.stopPropagation(); };

  return (
    <>
      <div 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => { e.stopPropagation(); handleItemClick(); }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (!isViewer && onEditModalOpen) {
            onEditModalOpen();
          }
        }}
        style={{ 
          display: 'flex', alignItems: 'center', padding: itemPadding,
          borderBottom: '1px solid var(--border-color)', marginLeft: `${depth * indentWidth}px`,
          position: 'relative', cursor: 'pointer',
          backgroundColor: (isMenuOpen || isHovered || isActiveParent || isEditingDeadline) ? 'var(--bg-item-hover)' : 'transparent',
          borderRadius: '4px', transition: 'background-color 0.2s, box-shadow 0.2s',
          fontSize: fontSize, boxShadow: isActiveParent ? '0 0 0 2px var(--color-primary) inset' : 'none'
        }}
      >
        {/* 閲覧者でない場合のみドロップエリアをマウント (タスク全体を覆う) */}
        {!isViewer && <NestDroppableInner task={task} tasks={tasks} depth={depth} />}

        {/* hasChildrenがtrueの時のみ開閉buttonをレンダリングする */}
        {hasChildren && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
            onDoubleClick={stopPropagation}
            style={{
                background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: isMobile ? '4px' : '0', marginRight: '2px', color: 'var(--text-placeholder)', 
                width: isMobile ? '32px' : '1.2em', height: isMobile ? '32px' : 'auto', zIndex: 21
            }}
            title={isExpanded ? "折りたたむ" : "展開する"}
          >
            {isExpanded ? <IconChevronDown size={isMobile ? 20 : 14} /> : <IconChevronRight size={isMobile ? 20 : 14} />}
          </button>
        )}

        {/* 子を持たないタスクのみ状態変更ボタンを表示 */}
        {!hasChildren && (
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              if (isViewer) return;
              onStatusChange(((task.status + 1) % 4) as 0|1|2|3); 
            }}
            onDoubleClick={stopPropagation}
            style={{ marginRight: '6px', backgroundColor: config.c, color: '#fff', minWidth: isMobile ? '68px' : '80px', fontSize: buttonFontSize, cursor: isViewer ? 'default' : 'pointer', border: 'none', borderRadius: '4px', padding: buttonPadding, lineHeight: '1.2', whiteSpace: 'nowrap', textAlign: 'center', zIndex: 21 }}
          >
            {config.l}
          </button>
        )}
        
        <div style={{ flex: 1, textAlign: 'left', wordBreak: 'break-all', whiteSpace: 'pre-wrap', position: 'relative', backgroundColor: 'transparent', borderRadius: '4px', padding: '2px' }}>
          <>
            <span title={isViewer ? "" : "ダブルクリックで詳細編集"} style={{ color: isUrgent ? 'var(--color-danger-text)' : 'inherit', fontWeight: hasChildren ? 'bold' : 'normal', textDecoration: task.status === 2 ? 'line-through' : 'none', opacity: (task.status === 2 || task.status === 3) ? 0.6 : 1, cursor: isViewer ? 'default' : 'pointer', fontSize: 'inherit', lineHeight: '1.4', zIndex: 21, position: 'relative' }}>{task.name}</span>
            {progress !== null && <span style={{ fontSize: '0.85em', color: 'var(--text-secondary)', marginLeft: '6px', fontWeight: 'normal', zIndex: 21, position: 'relative' }}>({progress}%)</span>}
            {isEditingDeadline && !isViewer && !isMobile ? (
                <input type="date" defaultValue={currentDeadlineStr} onChange={(e) => { onDeadlineChange(e.target.value); setIsEditingDeadline(false); }} onBlur={() => setIsEditingDeadline(false)} autoFocus onClick={(e) => e.stopPropagation()} onPointerDown={stopPropagation} style={{ marginLeft: '6px', padding: '2px', borderRadius: '4px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', colorScheme: 'dark', fontSize: 'inherit', zIndex: 21, position: 'relative' }} />
            ) : ( getDeadline() )}
          </>
        </div>
        
        {/* モバイル時はインラインのボタンを非表示にする */}
        {!isViewer && !isMobile && (
          <div style={{ display: 'flex', gap: '4px', opacity: (isHovered || isMenuOpen || isEditingDeadline) ? 1 : 0, pointerEvents: (isHovered || isMenuOpen || isEditingDeadline) ? 'auto' : 'none', transition: 'opacity 0.2s', marginLeft: '4px', zIndex: 21 }}>
            <button onClick={(e) => { e.stopPropagation(); setIsEditingDeadline(!isEditingDeadline); }} onDoubleClick={stopPropagation} title="期限を設定" style={{ display: 'flex', alignItems: 'center', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-placeholder)', padding: buttonPadding }}><IconCalendar size={16} /></button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} onDoubleClick={stopPropagation} title="削除" style={{ display: 'flex', alignItems: 'center', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-placeholder)', padding: buttonPadding }}><IconX size={16} /></button>
          </div>
        )}

        {/* 状態の割合を示す細長いゲージ (アニメーション付き) */}
        {hasChildren && (() => {
          const { p0, p1, p2, p3 } = getProgressData();
          return (
            <div style={{
              position: 'absolute', bottom: 0, left: 0, width: '100%', height: '4px',
              display: 'flex', zIndex: 1, backgroundColor: 'transparent'
            }}>
              {/* 完了 */}
              <div style={{ width: `${p2}%`, backgroundColor: 'var(--color-success)', position: 'relative', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)', borderBottomLeftRadius: '4px' }}>
                {p2 > 0 && !task.parentId && (
                  <svg width="12" height="14" viewBox="0 0 12 14" style={{ position: 'absolute', right: -9, top: '50%', transform: 'translateY(-50%)', zIndex: 3, overflow: 'visible' }}>
                    <path d="M 0 1 L 7 7 L 0 13 Z" fill="var(--color-success)" stroke="var(--color-success)" strokeWidth="3" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              {/* 進行中 */}
              <div style={{ width: `${p1}%`, backgroundColor: 'var(--color-info)', position: 'relative', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)', borderBottomLeftRadius: p2 === 0 ? '4px' : '0' }}>
                {p1 > 0 && !task.parentId && (
                  <svg width="12" height="14" viewBox="0 0 12 14" style={{ position: 'absolute', right: -9, top: '50%', transform: 'translateY(-50%)', zIndex: 2, overflow: 'visible' }}>
                    <path d="M 0 1 L 7 7 L 0 13 Z" fill="var(--color-info)" stroke="var(--color-info)" strokeWidth="3" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              {/* 未着手 */}
              <div style={{ width: `${p0}%`, backgroundColor: 'var(--text-placeholder)', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)', borderBottomLeftRadius: p2 === 0 && p1 === 0 ? '4px' : '0' }} />
              {/* 休止 */}
              <div style={{ width: `${p3}%`, backgroundColor: 'var(--color-suspend)', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)', borderBottomRightRadius: '4px', borderBottomLeftRadius: p2 === 0 && p1 === 0 && p0 === 0 ? '4px' : '0' }} />
            </div>
          );
        })()}

        {/* 挿入インジケーター */}
        {insertPosition && !isViewer && (
          <div style={{
            position: 'absolute',
            [insertPosition === 'top' ? 'top' : 'bottom']: -1,
            left: 0,
            right: 0,
            height: 0,
            borderTop: '2px dashed var(--color-primary)',
            zIndex: 9999,
            pointerEvents: 'none',
          }}>
            {/* 左端の三角形（内側向き） */}
            <div style={{ position: 'absolute', left: 0, top: -4, width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: '6px solid var(--color-primary)' }} />
            {/* 右端の三角形（内側向き） */}
            <div style={{ position: 'absolute', right: 0, top: -4, width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderRight: '6px solid var(--color-primary)' }} />
          </div>
        )}
      </div>

      {showStatusModal && !isViewer && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--overlay-bg)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }} onClick={(e) => { e.stopPropagation(); setShowStatusModal(false); }}>
          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '20px', borderRadius: '8px', width: '280px', border: '1px solid var(--border-color)', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
            <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>状態を一括変更</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button onClick={() => { onParentStatusChange(task.id, 0); setShowStatusModal(false); }} style={{ backgroundColor: 'var(--text-placeholder)', color: '#fff', textAlign: 'left' }}>未着手 (Todo)</button>
              <button onClick={() => { onParentStatusChange(task.id, 1); setShowStatusModal(false); }} style={{ backgroundColor: 'var(--color-info)', color: '#fff', textAlign: 'left' }}>進行中 (Doing)</button>
              <button onClick={() => { if(confirm('すべての子タスクを「完了」にします。\nよろしいですか？')) { onParentStatusChange(task.id, 2); setShowStatusModal(false); } }} style={{ backgroundColor: 'var(--color-success)', color: '#fff', textAlign: 'left' }}>完了 (Done)</button>
              <button onClick={() => { onParentStatusChange(task.id, 3); setShowStatusModal(false); }} style={{ backgroundColor: 'var(--color-suspend)', color: '#fff', textAlign: 'left' }}>休止 (Suspend)</button>
            </div>
            <button onClick={() => setShowStatusModal(false)} style={{ marginTop: '15px', width: '100%', background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>キャンセル</button>
          </div>
        </div>
      )}
    </>
  );
};