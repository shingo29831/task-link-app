import React from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { Task } from '../types';

interface Props {
  date: Date;
  tasks: Task[];
  onClose: () => void;
}

export const TaskDetailModal: React.FC<Props> = ({ date, tasks, onClose }) => {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center',
      alignItems: 'center', zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        backgroundColor: '#2a2a2a', 
        padding: '30px', // パディングを大きく (20px -> 30px)
        borderRadius: '12px', // 角丸も少し大きく
        width: '500px', // 幅を大きく (300px -> 500px)
        maxWidth: '90%', 
        maxHeight: '85vh', // 高さ制限も少し緩和
        overflowY: 'auto',
        boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
      }} onClick={e => e.stopPropagation()}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '1.5em' }}>{/* タイトル文字サイズ拡大 */}
            {format(date, 'M月d日のタスク', { locale: ja })}
          </h3>
          <button 
            onClick={onClose} 
            style={{ 
              padding: '8px 16px', // ボタンサイズ拡大
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}> {/* gapを拡大 */}
          {tasks.length === 0 ? (
            <p style={{ color: '#888', fontSize: '1.1em', textAlign: 'center', margin: '20px 0' }}> {/* 文字サイズ拡大 */}
              タスクはありません
            </p>
          ) : (
            tasks.map(t => (
              <div key={t.id} style={{
                padding: '16px', // アイテムのパディング拡大 (8px -> 16px)
                borderRadius: '6px', 
                fontSize: '1.1em', // 文字サイズ拡大 (0.85em -> 1.1em)
                backgroundColor: t.status === 2 ? '#28a745' : t.status === 3 ? '#6f42c1' : '#007bff',
                color: '#fff', 
                textDecoration: t.status === 2 ? 'line-through' : 'none',
                display: 'flex', flexDirection: 'column', gap: '4px'
              }}>
                {/* sourceProjectNameが存在する場合のみ表示 (他プロジェクトのタスク) */}
                {t.sourceProjectName && (
                    <span style={{ fontSize: '0.85em', opacity: 0.9, fontWeight: 'bold', marginBottom: '2px' }}>
                        [{t.sourceProjectName}]
                    </span>
                )}
                <span style={{ lineHeight: 1.4 }}>{t.name}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};