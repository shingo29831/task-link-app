import React, { useState, useMemo, useEffect } from 'react';
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
  onParentStatusChange: (id: string, s: 0 | 1 | 2 | 3) => void;
  onDelete: () => void;
  onRename: (newName: string) => void;
  onDeadlineChange: (dateStr: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onClick: () => void;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
}

export const TaskItem: React.FC<Props> = ({ 
  task, tasks, depth, hasChildren, 
  onStatusChange, onParentStatusChange, onDelete, onRename, onDeadlineChange, 
  isExpanded, onToggleExpand, onClick,
  isMenuOpen, onToggleMenu
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingDeadline, setIsEditingDeadline] = useState(false);
  const [editName, setEditName] = useState(task.name);
  const [isHovered, setIsHovered] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  // 画面幅監視
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth <= 1024;
  // 日付省略表示の基準 (480px以下)
  const isNarrowLayout = windowWidth <= 480;

  // 画面幅に応じたスタイル定義 (文字サイズを上げつつ、余白を詰める)
  const { fontSize, indentWidth, itemPadding, buttonPadding, buttonFontSize } = useMemo(() => {
    if (windowWidth <= 480) {
        return { 
            fontSize: '13px',      
            indentWidth: 12,       
            itemPadding: '6px 0',  
            buttonPadding: '2px 6px',
            buttonFontSize: '0.75em' 
        };
    } else if (windowWidth <= 768) {
        return { 
            fontSize: '14px',      
            indentWidth: 16, 
            itemPadding: '8px 0',
            buttonPadding: '3px 8px',
            buttonFontSize: '0.8em'
        };
    } else if (windowWidth <= 1024) {
        return { 
            fontSize: '15px',      
            indentWidth: 20, 
            itemPadding: '8px 0',
            buttonPadding: '4px 10px',
            buttonFontSize: '0.85em'
        };
    }
    // デスクトップ
    return { 
        fontSize: '16px', 
        indentWidth: 24, 
        itemPadding: '10px 0',
        buttonPadding: '4px 12px',
        buttonFontSize: '0.85em'
    };
  }, [windowWidth]);

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

    return <span style={{ color, fontSize: '0.85em', marginLeft: '6px', whiteSpace: 'nowrap' }}>{label}</span>;
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
    // 【修正】: イベントの伝播を止め、親要素（SortableTaskItem）のリスナーが
    // Enterキーを検知してドラッグを開始してしまうのを防ぎます。
    e.stopPropagation();

    if (e.key === 'Enter') {
      handleSave();
    }
    if (e.key === 'Escape') {
      setEditName(task.name);
      setIsEditing(false);
    }
  };

  const handleItemClick = () => {
      if (isEditing || isEditingDeadline) return;
      onClick();
      if (!isMenuOpen) {
          onToggleMenu();
      }
  };

  // イベント伝播を止めるヘルパー関数
  const stopPropagation = (e: React.PointerEvent) => {
    e.stopPropagation();
  };

  return (
    <>
      <div 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          handleItemClick();
        }}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          padding: itemPadding, // 動的パディング
          borderBottom: '1px solid #333', 
          marginLeft: `${depth * indentWidth}px`, // 動的インデント
          position: 'relative',
          cursor: 'pointer',
          backgroundColor: isMenuOpen ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
          borderRadius: '4px',
          transition: 'background-color 0.2s',
          fontSize: fontSize, // 動的フォントサイズ
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
              background: 'transparent', border: 'none', cursor: 'pointer', 
              fontSize: '1em', // 文字サイズに追従
              padding: '0', marginRight: '2px', // マージン縮小
              color: '#aaa', visibility: hasChildren ? 'visible' : 'hidden', 
              width: '1.2em', textAlign: 'center', lineHeight: '1'
          }}
          title={isExpanded ? "折りたたむ" : "展開する"}
        >
          {isExpanded ? '▼' : '▶'}
        </button>

        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            if (hasChildren) {
              setShowStatusModal(true);
            } else {
              onStatusChange(((task.status + 1) % 4) as 0|1|2|3); 
            }
          }}
          style={{ 
            marginRight: '6px', 
            backgroundColor: config.c, 
            color: '#fff', 
            minWidth: isMobile ? 'auto' : '80px', 
            fontSize: buttonFontSize, 
            cursor: 'pointer', 
            opacity: hasChildren ? 0.9 : 1, 
            border: hasChildren ? '1px dashed #fff' : 'none', 
            padding: buttonPadding, // 動的パディング
            lineHeight: '1.2',
            whiteSpace: 'nowrap'
          }}
        >
          {config.l}
        </button>
        
        <div style={{ flex: 1, textAlign: 'left', wordBreak: 'break-all', whiteSpace: 'pre-wrap', position: 'relative', backgroundColor: 'transparent', borderRadius: '4px', padding: '2px' }}>
          <div ref={setNodeRef} style={{ position: 'absolute', top: 0, left: depth === 0 ? '10%' : 'auto', right: depth === 0 ? 'auto' : 0, width: '80%', height: '100%', pointerEvents: 'none', backgroundColor: 'transparent', backgroundImage: 'none', borderRadius: '4px', zIndex: 10 }} />

          {isEditing ? (
            <input 
              type="text" value={editName} onChange={(e) => setEditName(e.target.value)} 
              onKeyDown={handleKeyDown} 
              onBlur={handleSave} autoFocus
              onClick={(e) => e.stopPropagation()} 
              onPointerDown={stopPropagation}
              style={{ 
                backgroundColor: '#333', 
                color: '#fff', 
                border: '1px solid #555', 
                padding: isMobile ? '4px' : '2px 4px', // パディング縮小
                borderRadius: '4px', 
                width: 'calc(100% - 20px)', 
                fontSize: isMobile ? '16px' : 'inherit' // モバイル入力時はズーム防止で16px維持
              }}
            />
          ) : (
            <>
              <span 
                onDoubleClick={(e) => { e.stopPropagation(); setEditName(task.name); setIsEditing(true); }} title="ダブルクリックで編集"
                style={{ 
                  color: isUrgent ? '#ff4d4f' : 'inherit', 
                  fontWeight: hasChildren ? 'bold' : 'normal', 
                  textDecoration: task.status === 2 ? 'line-through' : 'none', 
                  opacity: (task.status === 2 || task.status === 3) ? 0.6 : 1, 
                  cursor: 'pointer',
                  fontSize: 'inherit',
                  lineHeight: '1.4'
                }}
              >
                {task.name}
              </span>
              {progress !== null && <span style={{ fontSize: '0.85em', color: '#aaa', marginLeft: '6px', fontWeight: 'normal' }}>({progress}%)</span>}
              {isEditingDeadline ? (
                  <input 
                      type="date" 
                      defaultValue={currentDeadlineStr} 
                      className={isNarrowLayout ? "date-input-mobile" : ""} // 480px以下ならクラス付与
                      onChange={(e) => { onDeadlineChange(e.target.value); setIsEditingDeadline(false); }}
                      onBlur={() => setIsEditingDeadline(false)} autoFocus
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={stopPropagation}
                      style={{ 
                        marginLeft: '6px', 
                        padding: isMobile ? '2px' : '2px', 
                        borderRadius: '4px', 
                        border: '1px solid #555', 
                        backgroundColor: '#333', 
                        color: isNarrowLayout ? 'transparent' : '#fff', // 480px以下なら文字色透明
                        colorScheme: 'dark', 
                        fontSize: isMobile ? '16px' : 'inherit',
                        width: isNarrowLayout ? '36px' : 'auto' // 480px以下なら幅を狭める
                      }}
                  />
              ) : (
                  getDeadline()
              )}
            </>
          )}
        </div>
        
        <div style={{ 
            display: 'flex', 
            gap: isMobile ? '6px' : '4px', 
            opacity: (isHovered || isMenuOpen || isEditing || isEditingDeadline) ? 1 : 0,
            pointerEvents: (isHovered || isMenuOpen || isEditing || isEditingDeadline) ? 'auto' : 'none',
            transition: 'opacity 0.2s',
            marginLeft: '4px'
        }}>
          {/* モバイルレイアウト(480px以下)の時は、透明なinputをボタンに重ねて即座にカレンダーを開く */}
          {isNarrowLayout ? (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <button title="期限を設定" style={{ background: 'transparent', border: '1px solid #444', color: '#888', padding: buttonPadding, fontSize: buttonFontSize }}>📅</button>
              <input 
                type="date" 
                onChange={(e) => onDeadlineChange(e.target.value)}
                onPointerDown={stopPropagation}
                value={currentDeadlineStr}
                style={{ 
                  position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
                  opacity: 0, 
                  cursor: 'pointer',
                  zIndex: 2
                }} 
              />
            </div>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); setIsEditingDeadline(!isEditingDeadline); }} title="期限を設定" style={{ background: 'transparent', border: '1px solid #444', color: '#888', padding: buttonPadding, fontSize: buttonFontSize }}>📅</button>
          )}
          
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} title="削除" style={{ background: 'transparent', border: '1px solid #444', color: '#888', padding: buttonPadding, fontSize: buttonFontSize }}>✕</button>
        </div>
      </div>

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