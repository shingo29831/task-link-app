import React, { useState, useMemo } from 'react';
import { format, differenceInCalendarDays } from 'date-fns';
import { useDroppable, useDndContext } from '@dnd-kit/core'; 
import type { Task } from '../types';

type TaskNode = Task & { children: TaskNode[] };

interface Props {
  task: Task;
  tasks: Task[]; 
  depth: number;
  hasChildren: boolean;
  onStatusChange: (s: 0 | 1 | 2 | 3) => void;
  onParentStatusChange: (id: string, s: 0 | 1 | 2 | 3) => void; // 追加
  onDelete: () => void;
  onRename: (newName: string) => void;
  onDeadlineChange: (dateStr: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onClick: () => void;
}

export const TaskItem: React.FC<Props> = ({ 
  task, tasks, depth, hasChildren, 
  onStatusChange, onParentStatusChange, onDelete, onRename, onDeadlineChange, 
  isExpanded, onToggleExpand, onClick 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingDeadline, setIsEditingDeadline] = useState(false);
  const [editName, setEditName] = useState(task.name);
  const [isHovered, setIsHovered] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false); // 追加: モーダル表示用

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

  const config = { 
    0: { l: '未着手', c: '#888' }, 
    1: { l: '進行中', c: '#007bff' }, 
    2: { l: '完了', c: '#28a745' },
    3: { l: '休止', c: '#6f42c1' } 
  }[task.status] as any;

  const currentDeadlineStr = task.deadline !== undefined
    ? format(task.deadline, 'yyyy-MM-dd')
    : '';

  const daysRemaining = task.deadline !== undefined
    ? differenceInCalendarDays(task.deadline, new Date())
    : null;
    
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
    const color = daysRemaining < 0 ? '#dc3545' : daysRemaining === 0 ? '#ffc107' : '#888';
    
    let label = '';
    if (daysRemaining < 0) label = `${Math.abs(daysRemaining)}日超過`;
    else if (daysRemaining === 0) label = '今日まで';
    else label = `あと${daysRemaining}日`;

    return <span style={{ color, fontSize: '0.8em', marginLeft: '8px' }}>{label}</span>;
  };

  const calculateProgress = (): number | null => {
    const node = task as unknown as TaskNode;
    if (!node.children || node.children.length === 0) return null;

    let total = 0;
    let count = 0;

    const traverse = (n: TaskNode) => {
      if (!n.children || n.children.length === 0) {
        total += n.status === 2 ? 100 : n.status === 1 ? 50 : 0;
        count++;
      } else {
        n.children.forEach(traverse);
      }
    };

    node.children.forEach(traverse);

    if (count === 0) return null;
    return Math.round(total / count);
  };

  const progress = hasChildren ? calculateProgress() : null;

  const handleSave = () => {
    if (editName.trim() && editName !== task.name) {
      onRename(editName);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
    if (e.key === 'Escape') {
      setEditName(task.name);
      setIsEditing(false);
    }
  };

  return (
    <>
      <div 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          if (isEditing || isEditingDeadline) return;
          onClick();
        }}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          padding: '10px 0', 
          borderBottom: '1px solid #333', 
          marginLeft: `${depth * 24}px`,
          position: 'relative',
          cursor: 'pointer' 
        }}
      >
        {isOver && !isDropDisabled && (
          <div 
            style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              border: '2px dashed #646cff', boxSizing: 'border-box',
              pointerEvents: 'none', zIndex: 20, borderRadius: '4px'
            }}
          />
        )}

        <button
          onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
          style={{
              background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.8em', padding: '0', marginRight: '6px',
              color: '#aaa', visibility: hasChildren ? 'visible' : 'hidden', width: '16px', textAlign: 'center', lineHeight: '1'
          }}
          title={isExpanded ? "折りたたむ" : "展開する"}
        >
          {isExpanded ? '▼' : '▶'}
        </button>

        <button 
          // 変更: 親タスクの場合はモーダルを開く。子タスクを持たない場合は通常通り
          onClick={(e) => { 
            e.stopPropagation(); 
            if (hasChildren) {
              setShowStatusModal(true);
            } else {
              onStatusChange(((task.status + 1) % 4) as 0|1|2|3); 
            }
          }}
          style={{ marginRight: '12px', backgroundColor: config.c, color: '#fff', minWidth: '80px', fontSize: '0.75em', cursor: 'pointer', opacity: hasChildren ? 0.9 : 1, border: hasChildren ? '1px dashed #fff' : 'none', padding: '4px 8px' }}
        >
          {config.l}
        </button>
        
        <div style={{ flex: 1, textAlign: 'left', wordBreak: 'break-all', whiteSpace: 'pre-wrap', position: 'relative', backgroundColor: 'transparent', borderRadius: '4px', padding: '2px' }}>
          <div ref={setNodeRef} style={{ position: 'absolute', top: 0, left: depth === 0 ? '10%' : 'auto', right: depth === 0 ? 'auto' : 0, width: '80%', height: '100%', pointerEvents: 'none', backgroundColor: 'transparent', backgroundImage: 'none', borderRadius: '4px', zIndex: 10 }} />

          {isEditing ? (
            <input 
              type="text" value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={handleKeyDown} onBlur={handleSave} autoFocus
              onClick={(e) => e.stopPropagation()} 
              style={{ backgroundColor: '#333', color: '#fff', border: '1px solid #555', padding: '2px 4px', borderRadius: '4px', width: 'calc(100% - 20px)', fontSize: 'inherit' }}
            />
          ) : (
            <>
              <span 
                onDoubleClick={(e) => { e.stopPropagation(); setEditName(task.name); setIsEditing(true); }} title="ダブルクリックで編集"
                style={{ color: isUrgent ? '#ff4d4f' : 'inherit', fontWeight: hasChildren ? 'bold' : 'normal', textDecoration: task.status === 2 ? 'line-through' : 'none', opacity: (task.status === 2 || task.status === 3) ? 0.6 : 1, cursor: 'pointer' }}
              >
                {task.name}
              </span>
              {progress !== null && <span style={{ fontSize: '0.8em', color: '#aaa', marginLeft: '8px', fontWeight: 'normal' }}>({progress}%)</span>}
              {isEditingDeadline ? (
                  <input 
                      type="date" defaultValue={currentDeadlineStr} 
                      onChange={(e) => { onDeadlineChange(e.target.value); setIsEditingDeadline(false); }}
                      onBlur={() => setIsEditingDeadline(false)} autoFocus
                      onClick={(e) => e.stopPropagation()}
                      style={{ marginLeft: '8px', padding: '2px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: '#fff', colorScheme: 'dark' }}
                  />
              ) : (
                  getDeadline()
              )}
            </>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '4px', visibility: isHovered || isEditing || isEditingDeadline ? 'visible' : 'hidden' }}>
          <button onClick={(e) => { e.stopPropagation(); setIsEditingDeadline(!isEditingDeadline); }} title="期限を設定" style={{ background: 'transparent', border: '1px solid #444', color: '#888', padding: '2px 8px' }}>📅</button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} title="削除" style={{ background: 'transparent', border: '1px solid #444', color: '#888', padding: '2px 8px' }}>✕</button>
        </div>
      </div>

      {/* 親タスク用の状態変更モーダル */}
      {showStatusModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }} onClick={(e) => { e.stopPropagation(); setShowStatusModal(false); }}>
          <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '8px', width: '280px', border: '1px solid #444', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
            <h4 style={{ margin: '0 0 10px 0', color: '#fff', borderBottom: '1px solid #444', paddingBottom: '8px' }}>状態を一括変更</h4>
            <p style={{ fontSize: '0.85em', color: '#aaa', marginBottom: '15px' }}>親タスクの状態を変更すると、子タスクにも影響します。</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button onClick={() => { 
                onParentStatusChange(task.id, 0); 
                setShowStatusModal(false); 
              }} style={{ backgroundColor: '#888', color: '#fff', textAlign: 'left' }}>未着手 (Todo)</button>
              
              <button onClick={() => { 
                onParentStatusChange(task.id, 1); 
                setShowStatusModal(false); 
              }} style={{ backgroundColor: '#007bff', color: '#fff', textAlign: 'left' }}>進行中 (Doing)</button>
              
              <button onClick={() => { 
                if(confirm('すべての子タスクを「完了」にします。\nよろしいですか？')) {
                  onParentStatusChange(task.id, 2); 
                  setShowStatusModal(false); 
                }
              }} style={{ backgroundColor: '#28a745', color: '#fff', textAlign: 'left' }}>完了 (Done) <span style={{fontSize:'0.8em', opacity:0.7}}>※ 子タスクが完了になります。</span></button>
              
              <button onClick={() => { 
                onParentStatusChange(task.id, 3); 
                setShowStatusModal(false); 
              }} style={{ backgroundColor: '#6f42c1', color: '#fff', textAlign: 'left' }}>休止 (Suspend)</button>
            </div>
            <button onClick={() => setShowStatusModal(false)} style={{ marginTop: '15px', width: '100%', background: 'transparent', border: '1px solid #555', color: '#ccc' }}>キャンセル</button>
          </div>
        </div>
      )}
    </>
  );
};