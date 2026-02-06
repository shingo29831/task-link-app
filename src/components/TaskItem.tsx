import React, { useState, useMemo } from 'react'; // useMemoを追加
import { format, addDays, differenceInCalendarDays } from 'date-fns';
import { useDroppable, useDndContext } from '@dnd-kit/core'; 
import type { Task } from '../types';

type TaskNode = Task & { children: TaskNode[] };

interface Props {
  task: Task;
  tasks: Task[]; 
  projectStartDate: number;
  depth: number;
  hasChildren: boolean;
  onStatusChange: (s: 0 | 1 | 2 | 3) => void;
  onDelete: () => void;
  onAddSubTask: () => void;
  onRename: (newName: string) => void;
  onDeadlineChange: (dateStr: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export const TaskItem: React.FC<Props> = ({ task, tasks, projectStartDate, depth, hasChildren, onStatusChange, onDelete, onAddSubTask, onRename, onDeadlineChange, isExpanded, onToggleExpand }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingDeadline, setIsEditingDeadline] = useState(false);
  const [editName, setEditName] = useState(task.name);
  const [isHovered, setIsHovered] = useState(false);

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

  const currentDeadlineStr = task.deadlineOffset !== undefined
    ? format(addDays(projectStartDate, task.deadlineOffset), 'yyyy-MM-dd')
    : '';

  const daysRemaining = task.deadlineOffset !== undefined
    ? differenceInCalendarDays(addDays(projectStartDate, task.deadlineOffset), new Date())
    : null;
    
  // 変更: 自身または子孫タスクが緊急かどうかの判定 (再帰)
  const isUrgent = useMemo(() => {
    const checkRecursive = (t: Task): boolean => {
        // 自身の判定
        if (t.status !== 2 && t.deadlineOffset !== undefined) {
            const d = addDays(projectStartDate, t.deadlineOffset);
            const diff = differenceInCalendarDays(d, new Date());
            if (diff <= 1) return true;
        }
        // 子タスクの判定
        const children = tasks.filter(c => !c.isDeleted && c.parentId === t.id);
        return children.some(checkRecursive);
    };
    return checkRecursive(task);
  }, [task, tasks, projectStartDate]);

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
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        padding: '10px 0', 
        borderBottom: '1px solid #333', 
        marginLeft: `${depth * 24}px`,
        position: 'relative'
      }}
    >
      {isOver && !isDropDisabled && (
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: '2px dashed #646cff',
            boxSizing: 'border-box',
            pointerEvents: 'none',
            zIndex: 20,
            borderRadius: '4px'
          }}
        />
      )}

      {/* 開閉ボタン */}
      <button
        onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
        }}
        style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.8em',
            padding: '0',
            marginRight: '6px',
            color: '#aaa',
            visibility: hasChildren ? 'visible' : 'hidden',
            width: '16px',
            textAlign: 'center',
            lineHeight: '1'
        }}
        title={isExpanded ? "折りたたむ" : "展開する"}
      >
        {isExpanded ? '▼' : '▶'}
      </button>

      <button 
        disabled={hasChildren} 
        onClick={() => onStatusChange(((task.status + 1) % 4) as 0|1|2|3)}
        style={{ marginRight: '12px', backgroundColor: config.c, color: '#fff', minWidth: '80px', fontSize: '0.75em', cursor: hasChildren ? 'not-allowed' : 'pointer', opacity: hasChildren ? 0.6 : 1, border: hasChildren ? '1px dashed #fff' : 'none', padding: '4px 8px' }}
      >
        {config.l}
      </button>
      
      <div 
        style={{ 
          flex: 1, 
          textAlign: 'left', 
          wordBreak: 'break-all', 
          whiteSpace: 'pre-wrap',
          position: 'relative',
          backgroundColor: 'transparent',
          borderRadius: '4px',
          padding: '2px',
        }}
      >
        <div
            ref={setNodeRef}
            style={{
                position: 'absolute',
                top: 0,
                left: depth === 0 ? '10%' : 'auto', 
                right: depth === 0 ? 'auto' : 0, 
                width: '80%',
                height: '100%',
                pointerEvents: 'none',
                backgroundColor: 'transparent', 
                backgroundImage: 'none',        
                borderRadius: '4px',
                zIndex: 10,
            }}
        />

        {isEditing ? (
          <input 
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            autoFocus
            style={{ 
              backgroundColor: '#333', 
              color: '#fff', 
              border: '1px solid #555', 
              padding: '2px 4px', 
              borderRadius: '4px', 
              width: 'calc(100% - 20px)',
              fontSize: 'inherit'
            }}
          />
        ) : (
          <>
            <span 
              onDoubleClick={() => {
                setEditName(task.name);
                setIsEditing(true);
              }}
              title="ダブルクリックで編集"
              style={{ 
                color: isUrgent ? '#ff4d4f' : 'inherit',
                fontWeight: hasChildren ? 'bold' : 'normal', 
                textDecoration: task.status === 2 ? 'line-through' : 'none', 
                opacity: (task.status === 2 || task.status === 3) ? 0.6 : 1,
                cursor: 'pointer'
              }}
            >
              {task.name}
            </span>
            {progress !== null && (
              <span style={{ fontSize: '0.8em', color: '#aaa', marginLeft: '8px', fontWeight: 'normal' }}>
                ({progress}%)
              </span>
            )}
            {isEditingDeadline ? (
                <input 
                    type="date" 
                    defaultValue={currentDeadlineStr} 
                    onChange={(e) => {
                        onDeadlineChange(e.target.value);
                        setIsEditingDeadline(false);
                    }}
                    onBlur={() => setIsEditingDeadline(false)}
                    autoFocus
                    style={{ marginLeft: '8px', padding: '2px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: '#fff', colorScheme: 'dark' }}
                />
            ) : (
                getDeadline()
            )}
          </>
        )}
      </div>
      
      <div style={{ 
        display: 'flex', 
        gap: '4px',
        visibility: isHovered || isEditing || isEditingDeadline ? 'visible' : 'hidden',
      }}>
        <button 
          onClick={() => setIsEditingDeadline(!isEditingDeadline)} 
          title="期限を設定"
          style={{ background: 'transparent', border: '1px solid #444', color: '#888', padding: '2px 8px' }}
        >
          📅
        </button>
        <button onClick={onAddSubTask} title="子タスク追加" style={{ background: 'transparent', border: '1px solid #444', color: '#888', padding: '2px 8px' }}>＋</button>
        <button onClick={onDelete} title="削除" style={{ background: 'transparent', border: '1px solid #444', color: '#888', padding: '2px 8px' }}>✕</button>
      </div>
    </div>
  );
};