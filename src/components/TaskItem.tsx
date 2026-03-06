// 役割: 個別のタスクを表示し、ステータス変更やドラッグ＆ドロップのターゲットとなるUIコンポーネント
// なぜ: タスクの階層構造を視覚的に表現し、各タスクに対する直接的な操作を提供するため

import React, { useState, useMemo } from 'react';
import { format, differenceInCalendarDays } from 'date-fns';
import { useDroppable, useDndContext, useDndMonitor } from '@dnd-kit/core'; 
import { useTranslation } from 'react-i18next'; // ▼ 追加
import { useResponsive } from '../hooks/useResponsive';
import type { Task } from '../types';
import { IconCalendar, IconX, IconChevronDown, IconChevronRight } from './Icons';
import { FormattedTaskName } from './FormattedTaskName';

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

  const { setNodeRef } = useDroppable({
    id: `nest-${task.id}`,
    data: { type: 'nest', task },
    disabled: isDropDisabled
  });

  return (
    <>
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
  const { t } = useTranslation(); // ▼ 追加
  const [isHovered, setIsHovered] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [isEditingDeadline, setIsEditingDeadline] = useState(false);
  const [insertPosition, setInsertPosition] = useState<'top' | 'bottom' | null>(null);

  const { windowWidth, isMobile } = useResponsive();
  const { active } = useDndContext();
  const isDraggingAny = !!active;

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

  // ▼ t() を使って多言語化
  const config = { 
    0: { l: t('status_todo'), c: 'var(--text-placeholder)' },
    1: { l: t('status_doing'), c: 'var(--color-info)' }, 
    2: { l: t('status_done'), c: 'var(--color-success)' }, 
    3: { l: t('status_suspend'), c: 'var(--color-suspend)' } 
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
    
    if (task.status !== 2) {
      if (daysRemaining < 0) color = 'var(--color-danger)';
      else if (daysRemaining === 0) color = 'var(--color-warning)';
    }

    // ▼ t() を使って多言語化（引数付き）
    let label = daysRemaining < 0 
      ? t('overdue_days', { days: Math.abs(daysRemaining) }) 
      : daysRemaining === 0 
        ? t('due_today') 
        : t('days_remaining', { days: daysRemaining });
    
    return (
      <span style={{ 
        color, 
        fontSize: '0.85em', 
        marginLeft: '6px', 
        whiteSpace: 'nowrap',
        opacity: task.status === 2 ? 0.6 : 1
      }}>
        {label}
      </span>
    );
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
      p2: (counts[2] / total) * 100,
      p1: (counts[1] / total) * 100,
      p0: (counts[0] / total) * 100,
      p3: (counts[3] / total) * 100
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
        {!isViewer && <NestDroppableInner task={task} tasks={tasks} depth={depth} />}

        {hasChildren && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
            onDoubleClick={stopPropagation}
            style={{
                background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: isMobile ? '4px' : '0', marginRight: '2px', color: 'var(--text-placeholder)', 
                width: isMobile ? '32px' : '1.2em', height: isMobile ? '32px' : 'auto', zIndex: 21
            }}
            title={isExpanded ? t('collapse') : t('expand')} /* ▼ 多言語化 */
          >
            {isExpanded ? <IconChevronDown size={isMobile ? 20 : 14} /> : <IconChevronRight size={isMobile ? 20 : 14} />}
          </button>
        )}

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
            <span title={isViewer ? "" : t('double_click_to_edit')} style={{ color: isUrgent ? 'var(--color-danger-text)' : 'inherit', fontWeight: hasChildren ? 'bold' : 'normal', textDecoration: task.status === 2 ? 'line-through' : 'none', opacity: (task.status === 2 || task.status === 3) ? 0.6 : 1, cursor: isViewer ? 'default' : 'pointer', fontSize: 'inherit', lineHeight: '1.4', zIndex: 21, position: 'relative' }}>
              <FormattedTaskName name={task.name} />
            </span>
            {progress !== null && <span style={{ fontSize: '0.85em', color: 'var(--text-secondary)', marginLeft: '6px', fontWeight: 'normal', zIndex: 21, position: 'relative' }}>({progress}%)</span>}
            {isEditingDeadline && !isViewer && !isMobile ? (
                <input type="date" defaultValue={currentDeadlineStr} onChange={(e) => { onDeadlineChange(e.target.value); setIsEditingDeadline(false); }} onBlur={() => setIsEditingDeadline(false)} autoFocus onClick={(e) => e.stopPropagation()} onPointerDown={stopPropagation} style={{ marginLeft: '6px', padding: '2px', borderRadius: '4px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', colorScheme: 'dark', fontSize: 'inherit', zIndex: 21, position: 'relative' }} />
            ) : ( getDeadline() )}
          </>
        </div>
        
        {!isViewer && !isMobile && !isDraggingAny && (
          <div style={{ display: 'flex', gap: '4px', opacity: (isHovered || isMenuOpen || isEditingDeadline) ? 1 : 0, pointerEvents: (isHovered || isMenuOpen || isEditingDeadline) ? 'auto' : 'none', transition: 'opacity 0.2s', marginLeft: '4px', zIndex: 21 }}>
            <button onClick={(e) => { e.stopPropagation(); setIsEditingDeadline(!isEditingDeadline); }} onDoubleClick={stopPropagation} title={t('set_deadline')} style={{ display: 'flex', alignItems: 'center', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-placeholder)', padding: buttonPadding }}><IconCalendar size={16} /></button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} onDoubleClick={stopPropagation} title={t('delete')} style={{ display: 'flex', alignItems: 'center', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-placeholder)', padding: buttonPadding }}><IconX size={16} /></button>
          </div>
        )}

        {hasChildren && (() => {
          const { p0, p1, p2, p3 } = getProgressData();
          return (
            <div style={{
              position: 'absolute', bottom: 0, left: 0, width: '100%', height: '4px',
              display: 'flex', zIndex: 1, backgroundColor: 'transparent'
            }}>
              <div style={{ width: `${p2}%`, backgroundColor: 'var(--color-success)', position: 'relative', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)', borderBottomLeftRadius: '4px' }}>
                {p2 > 0 && !task.parentId && (
                  <svg width="12" height="14" viewBox="0 0 12 14" style={{ position: 'absolute', right: -9, top: '50%', transform: 'translateY(-50%)', zIndex: 3, overflow: 'visible' }}>
                    <path d="M 0 1 L 7 7 L 0 13 Z" fill="var(--color-success)" stroke="var(--color-success)" strokeWidth="3" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div style={{ width: `${p1}%`, backgroundColor: 'var(--color-info)', position: 'relative', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)', borderBottomLeftRadius: p2 === 0 ? '4px' : '0' }}>
                {p1 > 0 && !task.parentId && (
                  <svg width="12" height="14" viewBox="0 0 12 14" style={{ position: 'absolute', right: -9, top: '50%', transform: 'translateY(-50%)', zIndex: 2, overflow: 'visible' }}>
                    <path d="M 0 1 L 7 7 L 0 13 Z" fill="var(--color-info)" stroke="var(--color-info)" strokeWidth="3" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div style={{ width: `${p0}%`, backgroundColor: 'var(--text-placeholder)', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)', borderBottomLeftRadius: p2 === 0 && p1 === 0 ? '4px' : '0' }} />
              <div style={{ width: `${p3}%`, backgroundColor: 'var(--color-suspend)', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)', borderBottomRightRadius: '4px', borderBottomLeftRadius: p2 === 0 && p1 === 0 && p0 === 0 ? '4px' : '0' }} />
            </div>
          );
        })()}

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
            <div style={{ position: 'absolute', left: 0, top: -4, width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: '6px solid var(--color-primary)' }} />
            <div style={{ position: 'absolute', right: 0, top: -4, width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderRight: '6px solid var(--color-primary)' }} />
          </div>
        )}
      </div>

      {showStatusModal && !isViewer && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--overlay-bg)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }} onClick={(e) => { e.stopPropagation(); setShowStatusModal(false); }}>
          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '20px', borderRadius: '8px', width: '280px', border: '1px solid var(--border-color)', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
            <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>{t('batch_change_status')}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button onClick={() => { onParentStatusChange(task.id, 0); setShowStatusModal(false); }} style={{ backgroundColor: 'var(--text-placeholder)', color: '#fff', textAlign: 'left' }}>{t('status_todo_label')}</button>
              <button onClick={() => { onParentStatusChange(task.id, 1); setShowStatusModal(false); }} style={{ backgroundColor: 'var(--color-info)', color: '#fff', textAlign: 'left' }}>{t('status_doing_label')}</button>
              <button onClick={() => { if(confirm(t('confirm_complete_all_children'))) { onParentStatusChange(task.id, 2); setShowStatusModal(false); } }} style={{ backgroundColor: 'var(--color-success)', color: '#fff', textAlign: 'left' }}>{t('status_done_label')}</button>
              <button onClick={() => { onParentStatusChange(task.id, 3); setShowStatusModal(false); }} style={{ backgroundColor: 'var(--color-suspend)', color: '#fff', textAlign: 'left' }}>{t('status_suspend_label')}</button>
            </div>
            <button onClick={() => setShowStatusModal(false)} style={{ marginTop: '15px', width: '100%', background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>{t('cancel')}</button>
          </div>
        </div>
      )}
    </>
  );
};