import React, { useState, useMemo } from 'react';
import { format, differenceInCalendarDays } from 'date-fns';
import { useDroppable, useDndContext } from '@dnd-kit/core'; 
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
  onRename: (newName: string) => void;
  onDeadlineChange: (dateStr: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onClick: () => void;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  isActiveParent?: boolean;
  isViewer?: boolean;
}

// DnDが有効な場合のみマウントされるネスト用ドロップエリア
const NestDroppableInner: React.FC<{ task: Task, tasks: Task[], depth: number }> = ({ task, tasks, depth }) => {
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
      <div ref={setNodeRef} style={{ position: 'absolute', top: 0, left: depth === 0 ? '10%' : 'auto', right: depth === 0 ? 'auto' : 0, width: '80%', height: '100%', pointerEvents: 'none', zIndex: 10 }} />
    </>
  );
};

export const TaskItem: React.FC<Props> = ({ 
  task, tasks, depth, hasChildren, 
  onStatusChange, onParentStatusChange, onDelete, onRename, onDeadlineChange, 
  isExpanded, onToggleExpand, onClick,
  isMenuOpen, onToggleMenu,
  isActiveParent = false,
  isViewer = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingDeadline, setIsEditingDeadline] = useState(false);
  const [editName, setEditName] = useState(task.name);
  const [isHovered, setIsHovered] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const { windowWidth, isMobile, isNarrowLayout } = useResponsive();

  const { fontSize, indentWidth, itemPadding, buttonPadding, buttonFontSize } = useMemo(() => {
    if (windowWidth <= 480) {
        return { fontSize: '13px', indentWidth: 12, itemPadding: '6px 0', buttonPadding: '2px 6px', buttonFontSize: '0.75em' };
    } else if (windowWidth <= 768) {
        return { fontSize: '14px', indentWidth: 16, itemPadding: '8px 0', buttonPadding: '3px 8px', buttonFontSize: '0.8em' };
    } else if (windowWidth < 1280) {
        return { fontSize: '15px', indentWidth: 20, itemPadding: '8px 0', buttonPadding: '4px 10px', buttonFontSize: '0.85em' };
    }
    return { fontSize: '16px', indentWidth: 24, itemPadding: '10px 0', buttonPadding: '4px 12px', buttonFontSize: '0.85em' };
  }, [windowWidth]);

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

  const progress = hasChildren ? calculateProgress() : null;

  const handleSave = () => {
    if (editName.trim() && editName !== task.name) { onRename(editName); }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter') { handleSave(); }
    if (e.key === 'Escape') { setEditName(task.name); setIsEditing(false); }
  };

  const handleItemClick = () => {
      if (isEditing || isEditingDeadline) return;
      onClick();
      if (!isMenuOpen) { onToggleMenu(); }
  };

  const stopPropagation = (e: React.PointerEvent) => { e.stopPropagation(); };

  return (
    <>
      <div 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => { e.stopPropagation(); handleItemClick(); }}
        style={{ 
          display: 'flex', alignItems: 'center', padding: itemPadding,
          borderBottom: '1px solid var(--border-color)', marginLeft: `${depth * indentWidth}px`,
          position: 'relative', cursor: 'pointer',
          backgroundColor: (isMenuOpen || isHovered || isActiveParent) ? 'var(--bg-item-hover)' : 'transparent',
          borderRadius: '4px', transition: 'background-color 0.2s, box-shadow 0.2s',
          fontSize: fontSize, boxShadow: isActiveParent ? '0 0 0 2px var(--color-primary) inset' : 'none',
        }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
          style={{
              background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0', marginRight: '2px', color: 'var(--text-placeholder)', visibility: hasChildren ? 'visible' : 'hidden', 
              width: '1.2em'
          }}
          title={isExpanded ? "折りたたむ" : "展開する"}
        >
          {isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
        </button>

        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            if (isViewer) return;
            if (hasChildren) { setShowStatusModal(true); } else { onStatusChange(((task.status + 1) % 4) as 0|1|2|3); }
          }}
          style={{ marginRight: '6px', backgroundColor: config.c, color: '#fff', minWidth: isMobile ? 'auto' : '80px', fontSize: buttonFontSize, cursor: isViewer ? 'default' : 'pointer', opacity: hasChildren ? 0.9 : 1, border: hasChildren ? '1px dashed var(--text-inverse)' : 'none', padding: buttonPadding, lineHeight: '1.2', whiteSpace: 'nowrap' }}
        >
          {config.l}
        </button>
        
        <div style={{ flex: 1, textAlign: 'left', wordBreak: 'break-all', whiteSpace: 'pre-wrap', position: 'relative', backgroundColor: 'transparent', borderRadius: '4px', padding: '2px' }}>
          
          {/* 閲覧者でない場合のみドロップエリアをマウント */}
          {!isViewer && <NestDroppableInner task={task} tasks={tasks} depth={depth} />}

          {isEditing ? (
            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={handleKeyDown} onBlur={handleSave} autoFocus onClick={(e) => e.stopPropagation()} onPointerDown={stopPropagation} style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', padding: isMobile ? '4px' : '2px 4px', borderRadius: '4px', width: 'calc(100% - 20px)', fontSize: isMobile ? '16px' : 'inherit' }} />
          ) : (
            <>
              <span onDoubleClick={(e) => { e.stopPropagation(); if (isViewer) return; setEditName(task.name); setIsEditing(true); }} title={isViewer ? "" : "ダブルクリックで編集"} style={{ color: isUrgent ? 'var(--color-danger-text)' : 'inherit', fontWeight: hasChildren ? 'bold' : 'normal', textDecoration: task.status === 2 ? 'line-through' : 'none', opacity: (task.status === 2 || task.status === 3) ? 0.6 : 1, cursor: isViewer ? 'default' : 'pointer', fontSize: 'inherit', lineHeight: '1.4' }}>{task.name}</span>
              {progress !== null && <span style={{ fontSize: '0.85em', color: 'var(--text-secondary)', marginLeft: '6px', fontWeight: 'normal' }}>({progress}%)</span>}
              {isEditingDeadline && !isViewer ? (
                  <input type="date" defaultValue={currentDeadlineStr} className={isNarrowLayout ? "date-input-mobile" : ""} onChange={(e) => { onDeadlineChange(e.target.value); setIsEditingDeadline(false); }} onBlur={() => setIsEditingDeadline(false)} autoFocus onClick={(e) => e.stopPropagation()} onPointerDown={stopPropagation} style={{ marginLeft: '6px', padding: '2px', borderRadius: '4px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-input)', color: isNarrowLayout ? 'transparent' : 'var(--text-primary)', colorScheme: 'dark', fontSize: isMobile ? '16px' : 'inherit', width: isNarrowLayout ? '36px' : 'auto' }} />
              ) : ( getDeadline() )}
            </>
          )}
        </div>
        
        {!isViewer && (
          <div style={{ display: 'flex', gap: isMobile ? '6px' : '4px', opacity: (isHovered || isMenuOpen || isEditing || isEditingDeadline) ? 1 : 0, pointerEvents: (isHovered || isMenuOpen || isEditing || isEditingDeadline) ? 'auto' : 'none', transition: 'opacity 0.2s', marginLeft: '4px' }}>
            {isNarrowLayout ? (
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <button title="期限を設定" style={{ display: 'flex', alignItems: 'center', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-placeholder)', padding: buttonPadding }}><IconCalendar size={16} /></button>
                <input type="date" onChange={(e) => onDeadlineChange(e.target.value)} onPointerDown={stopPropagation} value={currentDeadlineStr} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 2 }} />
              </div>
            ) : (
              <button onClick={(e) => { e.stopPropagation(); setIsEditingDeadline(!isEditingDeadline); }} title="期限を設定" style={{ display: 'flex', alignItems: 'center', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-placeholder)', padding: buttonPadding }}><IconCalendar size={16} /></button>
            )}
            
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} title="削除" style={{ display: 'flex', alignItems: 'center', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-placeholder)', padding: buttonPadding }}><IconX size={16} /></button>
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