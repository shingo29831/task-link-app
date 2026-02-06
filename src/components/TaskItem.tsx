import React, { useState } from 'react';
import { format, addDays } from 'date-fns';
import { useDroppable, useDndContext } from '@dnd-kit/core'; // useDndContextを追加
import type { Task } from '../types';

// 子要素を持つTaskNode型を定義
type TaskNode = Task & { children: TaskNode[] };

interface Props {
  task: Task;
  tasks: Task[]; // 全タスクデータを参照できるように追加
  projectStartDate: number;
  depth: number;
  hasChildren: boolean;
  onStatusChange: (s: 0 | 1 | 2 | 3) => void;
  onDelete: () => void;
  onAddSubTask: () => void;
  onRename: (newName: string) => void;
  onDeadlineChange: (dateStr: string) => void;
}

export const TaskItem: React.FC<Props> = ({ task, tasks, projectStartDate, depth, hasChildren, onStatusChange, onDelete, onAddSubTask, onRename, onDeadlineChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingDeadline, setIsEditingDeadline] = useState(false);
  const [editName, setEditName] = useState(task.name);
  const [isHovered, setIsHovered] = useState(false);

  const { active } = useDndContext(); // ドラッグ中のアイテム情報を取得

  // ドロップ無効判定ロジック
  const isDropDisabled = (() => {
    if (!active) return false;
    const activeId = String(active.id);

    // 1. 自分自身がドラッグされている場合
    if (activeId === task.id) return true;

    // 2. ドラッグされているタスクが自分の「祖先」である場合（＝自分がドラッグ中のタスクの子孫である場合）
    // 親を遡って activeId に到達するかチェック
    let current = task;
    while (current.parentId) {
      if (current.parentId === activeId) return true;
      const parent = tasks.find(t => t.id === current.parentId);
      if (!parent) break;
      current = parent;
    }
    return false;
  })();

  // ドロップ領域の設定
  const { setNodeRef, isOver } = useDroppable({
    id: `nest-${task.id}`,
    data: { type: 'nest', task },
    disabled: isDropDisabled // 無効化フラグを設定
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

  const getDeadline = () => {
    if (task.deadlineOffset === undefined) return null;
    const days = Math.ceil((new Date(projectStartDate + task.deadlineOffset * 86400000).getTime() - new Date().setHours(0,0,0,0)) / 86400000);
    const color = days < 0 ? '#dc3545' : days === 0 ? '#ffc107' : '#888';
    return <span style={{ color, fontSize: '0.8em', marginLeft: '8px' }}>{days < 0 ? `${Math.abs(days)}日超過` : days === 0 ? '今日まで' : `あと${days}日`}</span>;
  };

  const calculateProgress = (): number | null => {
    const node = task as unknown as TaskNode;
    if (!node.children || node.children.length === 0) return null;

    let total = 0;
    let count = 0;

    const traverse = (n: TaskNode) => {
      if (!n.children || n.children.length === 0) {
        if (n.status !== 3) {
          total += n.status === 2 ? 100 : n.status === 1 ? 50 : 0;
          count++;
        }
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
      {/* 全域枠線用オーバーレイ */}
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
        {/* ドロップ判定用エリア（右1/3） */}
        <div
            ref={setNodeRef}
            style={{
                position: 'absolute',
                top: 0,
                right: 0, 
                width: '33%', // 右1/3
                height: '100%',
                pointerEvents: 'none',
                backgroundColor: isOver && !isDropDisabled ? '#2a2a2a' : 'transparent', 
                backgroundImage: isOver && !isDropDisabled ? 'linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05))' : 'none',
                borderRadius: '4px',
                transition: 'background-color 0.2s',
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