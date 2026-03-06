import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next'; // ▼ 追加
import { IconPlus, IconCalendar, IconX } from './Icons';
import type { Task } from '../types';

interface Props {
  taskName: string;
  setTaskName: (val: string) => void;
  dateStr: string;
  setDateStr: (val: string) => void;
  activeTasks?: Task[];
  initialParentId?: string | null;
  onSubmit: (parentId?: string) => void;
  onClose: () => void;
}

export const TaskAddModal: React.FC<Props> = ({ 
  taskName, setTaskName, dateStr, setDateStr, activeTasks, initialParentId, onSubmit, onClose 
}) => {
  const { t } = useTranslation(); // ▼ 追加
  const [searchWord, setSearchWord] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(initialParentId || null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;
    onSubmit(selectedParentId || undefined);
    onClose();
  };

  const stopPropagation = (e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation();
  };

  const getHierarchyName = useCallback((task: Task) => {
    if (!activeTasks) return task.name;
    let path = [task.name];
    let current = task;
    let depth = 0;
    while (current.parentId && depth < 2) {
        const parent = activeTasks.find(t => t.id === current.parentId);
        if (parent) {
            path.unshift(parent.name);
            current = parent;
            depth++;
        } else {
            break;
        }
    }
    const truncate = (str: string) => str.length > 15 ? str.slice(0, 15) + '...' : str;
    return path.map(truncate).join(' > ');
  }, [activeTasks]);

  const candidates = useMemo(() => {
    if (!searchWord.trim() || !activeTasks) return [];
    const lowerWord = searchWord.toLowerCase();
    return activeTasks
        .filter(t => !t.isDeleted && t.name.toLowerCase().includes(lowerWord))
        .slice(0, 10);
  }, [searchWord, activeTasks]);

  return (
    <div 
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: '100%', maxWidth: '400px', backgroundColor: 'var(--bg-surface)',
          borderRadius: '12px', padding: '20px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column', gap: '16px'
        }}
        onClick={stopPropagation}
      >
        <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>{t('add_new_task')}</h3>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input 
            type="text" 
            placeholder={t('placeholder_enter_task')} 
            autoFocus
            value={taskName} 
            onChange={(e) => setTaskName(e.target.value)} 
            style={{ 
              width: '100%', padding: '12px', borderRadius: '8px', 
              border: '2px solid var(--border-light)', background: 'var(--bg-input)', 
              color: 'var(--text-primary)', fontSize: '16px', boxSizing: 'border-box'
            }} 
          />

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button 
              type="button"
              style={{ 
                flex: 1, display: 'flex', alignItems: 'center', gap: '10px',
                background: 'var(--bg-input)', border: '2px solid var(--border-light)', 
                color: 'var(--text-primary)', padding: '12px', borderRadius: '8px',
                fontSize: '14px', cursor: 'pointer'
              }}
            >
              <IconCalendar size={20} />
              <span>{dateStr || t('no_deadline')}</span>
            </button>
            <input 
              type="date" 
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)} 
              style={{ 
                position: 'absolute', top: 0, left: 0, width: '100%', 
                height: '100%', opacity: 0, cursor: 'pointer'
              }} 
            />
          </div>

          {activeTasks && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{t('select_parent_task')}</span>
                {selectedParentId ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-item-hover)', borderRadius: '8px', border: '1px solid var(--color-primary)' }}>
                        <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{getHierarchyName(activeTasks.find(t => t.id === selectedParentId) || { name: t('unknown') } as any)}</span>
                        <button type="button" onClick={() => setSelectedParentId(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}><IconX size={16} /></button>
                    </div>
                ) : (
                    <div>
                        <input 
                            type="text" 
                            placeholder={t('search_parent_task')} 
                            value={searchWord} 
                            onChange={(e) => setSearchWord(e.target.value)} 
                            style={{ 
                                width: '100%', padding: '10px', borderRadius: '8px', 
                                border: '1px solid var(--border-light)', background: 'var(--bg-input)', 
                                color: 'var(--text-primary)', fontSize: '14px', boxSizing: 'border-box'
                            }} 
                        />
                        {candidates.length > 0 && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '4px', zIndex: 10, maxHeight: '150px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                                {candidates.map(c => (
                                    <div 
                                        key={c.id} 
                                        onClick={() => { setSelectedParentId(c.id); setSearchWord(''); }}
                                        style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', fontSize: '13px', color: 'var(--text-primary)' }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-item-hover)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        {getHierarchyName(c)}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button 
              type="button" 
              onClick={onClose}
              style={{ 
                flex: 1, padding: '12px', backgroundColor: 'transparent', 
                color: 'var(--text-secondary)', border: '1px solid var(--border-color)', 
                borderRadius: '8px', fontWeight: 'bold' 
              }}
            >
              {t('cancel')}
            </button>
            <button 
              type="submit" 
              disabled={!taskName.trim()} 
              style={{ 
                flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '12px', 
                backgroundColor: !taskName.trim() ? 'var(--border-light)' : 'var(--color-primary)', 
                color: '#fff', border: 'none', borderRadius: '8px', 
                cursor: !taskName.trim() ? 'not-allowed' : 'pointer', fontWeight: 'bold' 
              }}
            >
              <IconPlus size={20} />
              <span>{t('add')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};