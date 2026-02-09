import React, { useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { Task } from '../types';

interface Props {
  date: Date;
  tasks: Task[];
  activeTasks: Task[];
  onClose: () => void;
  onStatusChange: (id: string, status: 0 | 1 | 2 | 3) => void;
  onParentStatusChange: (id: string, status: 0 | 1 | 2 | 3) => void;
}

export const TaskDetailModal: React.FC<Props> = ({ date, tasks, activeTasks, onClose, onStatusChange, onParentStatusChange }) => {
  const [statusModalTargetId, setStatusModalTargetId] = useState<string | null>(null);

  const getTaskMeta = (task: Task) => {
      // 現在のプロジェクトのタスクかどうか判定
      const original = activeTasks.find(t => t.id === task.id);
      if (!original) return { isCurrent: false, hasChildren: false };
      
      const hasChildren = activeTasks.some(t => !t.isDeleted && t.parentId === original.id);
      return { isCurrent: true, hasChildren };
  };

  const handleStatusClick = (task: Task) => {
      const { isCurrent, hasChildren } = getTaskMeta(task);
      if (!isCurrent) return; // 他プロジェクトは編集不可

      if (hasChildren) {
          setStatusModalTargetId(task.id);
      } else {
          const next = ((task.status + 1) % 4) as 0 | 1 | 2 | 3;
          onStatusChange(task.id, next);
      }
  };

  const getConfig = (status: number) => ({ 
    0: { l: '未着手', c: '#888' }, 
    1: { l: '進行中', c: '#007bff' }, 
    2: { l: '完了', c: '#28a745' }, 
    3: { l: '休止', c: '#6f42c1' } 
  }[status] as any);

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center',
        alignItems: 'center', zIndex: 1000
      }} onClick={onClose}>
        <div style={{
          backgroundColor: '#2a2a2a', 
          padding: '30px', 
          borderRadius: '12px', 
          width: '500px', 
          maxWidth: '90%', 
          maxHeight: '85vh', 
          overflowY: 'auto',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
        }} onClick={e => e.stopPropagation()}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.5em' }}>
              {format(date, 'M月d日のタスク', { locale: ja })}
            </h3>
            <button 
              onClick={onClose} 
              style={{ 
                padding: '8px 16px', 
                fontSize: '1.2em', 
                background: 'transparent', 
                border: '1px solid #555', 
                color: '#ccc',
                cursor: 'pointer',
                borderRadius: '4px'
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tasks.length === 0 ? (
              <p style={{ color: '#888', fontSize: '1.1em', textAlign: 'center', margin: '20px 0' }}>
                タスクはありません
              </p>
            ) : (
              tasks.map(t => {
                const config = getConfig(t.status);
                const { isCurrent, hasChildren } = getTaskMeta(t);

                return (
                  <div key={t.id} style={{
                    padding: '16px', 
                    borderRadius: '6px', 
                    backgroundColor: '#333',
                    border: '1px solid #444',
                    display: 'flex', alignItems: 'center', gap: '12px'
                  }}>
                    {/* Status Button */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleStatusClick(t); }}
                      disabled={!isCurrent}
                      style={{ 
                        backgroundColor: config.c, 
                        color: '#fff', 
                        minWidth: '80px', 
                        fontSize: '0.9em', 
                        cursor: isCurrent ? 'pointer' : 'default', 
                        opacity: isCurrent ? (hasChildren ? 0.9 : 1) : 0.5, 
                        border: hasChildren ? '1px dashed #fff' : 'none', 
                        padding: '6px 12px',
                        flexShrink: 0
                      }}
                    >
                      {config.l}
                    </button>

                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      {t.sourceProjectName && (
                          <div style={{ fontSize: '0.85em', opacity: 0.7, fontWeight: 'bold', marginBottom: '2px', color: '#aaa' }}>
                              [{t.sourceProjectName}]
                          </div>
                      )}
                      <div style={{ 
                        fontSize: '1.1em', 
                        color: '#fff', 
                        textDecoration: t.status === 2 ? 'line-through' : 'none',
                        wordBreak: 'break-all'
                      }}>
                        {t.name}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Parent Status Modal (Overlay on top of Detail Modal) */}
      {statusModalTargetId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000
        }} onClick={(e) => { e.stopPropagation(); setStatusModalTargetId(null); }}>
          <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '8px', width: '280px', border: '1px solid #444', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
            <h4 style={{ margin: '0 0 10px 0', color: '#fff', borderBottom: '1px solid #444', paddingBottom: '8px' }}>状態を一括変更</h4>
            <p style={{ fontSize: '0.85em', color: '#aaa', marginBottom: '15px' }}>親タスクの状態を変更すると、子タスクにも影響します。</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button onClick={() => { onParentStatusChange(statusModalTargetId, 0); setStatusModalTargetId(null); }} style={{ backgroundColor: '#888', color: '#fff', textAlign: 'left' }}>未着手 (Todo)</button>
              <button onClick={() => { onParentStatusChange(statusModalTargetId, 1); setStatusModalTargetId(null); }} style={{ backgroundColor: '#007bff', color: '#fff', textAlign: 'left' }}>進行中 (Doing)</button>
              <button onClick={() => { 
                if(confirm('すべての子タスクを「完了」にします。\nよろしいですか？')) {
                  onParentStatusChange(statusModalTargetId, 2); 
                  setStatusModalTargetId(null); 
                }
              }} style={{ backgroundColor: '#28a745', color: '#fff', textAlign: 'left' }}>完了 (Done)</button>
              <button onClick={() => { onParentStatusChange(statusModalTargetId, 3); setStatusModalTargetId(null); }} style={{ backgroundColor: '#6f42c1', color: '#fff', textAlign: 'left' }}>休止 (Suspend)</button>
            </div>
            <button onClick={() => setStatusModalTargetId(null)} style={{ marginTop: '15px', width: '100%', background: 'transparent', border: '1px solid #555', color: '#ccc' }}>キャンセル</button>
          </div>
        </div>
      )}
    </>
  );
};