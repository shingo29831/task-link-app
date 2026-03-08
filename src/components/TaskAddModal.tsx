import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { IconPlus, IconCalendar, IconX } from './Icons';
import type { Task, AppData } from '../types';

interface Props {
  taskName: string;
  setTaskName: (val: string) => void;
  dateStr: string;
  setDateStr: (val: string) => void;
  projects?: AppData[]; 
  initialProjectId?: string; 
  activeTasks?: Task[]; 
  initialParentId?: string | null;
  onSubmit: (parentId?: string, projectId?: string) => void; 
  onClose: () => void;
}

export const TaskAddModal: React.FC<Props> = ({ 
  taskName, setTaskName, dateStr, setDateStr, projects, initialProjectId, activeTasks: defaultActiveTasks, initialParentId, onSubmit, onClose 
}) => {
  const { t } = useTranslation();
  const [searchWord, setSearchWord] = useState('');
  
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId || (projects?.[0]?.id ?? ''));
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [showProjectSelect, setShowProjectSelect] = useState(false);

  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialParentId) {
       if (initialParentId.includes('_')) {
           const parts = initialParentId.split('_');
           const projId = parts[0];
           const taskId = parts[1];
           if (projects?.find(p => p.id === projId)) {
               setSelectedProjectId(projId);
               setSelectedParentId(taskId);
           }
       } else {
           setSelectedParentId(initialParentId);
           if (initialProjectId) setSelectedProjectId(initialProjectId);
       }
    } else {
        setSelectedParentId(null);
        if (initialProjectId) setSelectedProjectId(initialProjectId);
    }
  }, [initialParentId, initialProjectId, projects]);

  const activeTasksForSelect = useMemo(() => {
    if (projects && selectedProjectId) {
      const proj = projects.find(p => p.id === selectedProjectId);
      if (proj) return proj.tasks.filter((t: Task) => !t.isDeleted);
    }
    return defaultActiveTasks;
  }, [projects, selectedProjectId, defaultActiveTasks]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;
    onSubmit(selectedParentId || undefined, selectedProjectId);
    onClose();
  };

  const stopPropagation = (e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleProjectChange = (projId: string) => {
      setSelectedProjectId(projId);
      setSelectedParentId(null);
      setShowProjectSelect(false);
  };

  const getHierarchyName = useCallback((task: Task) => {
    if (!activeTasksForSelect) return task.name;
    let path = [task.name];
    let current = task;
    let depth = 0;
    while (current.parentId && depth < 2) {
        const parent = activeTasksForSelect.find(t => t.id === current.parentId);
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
  }, [activeTasksForSelect]);

  const candidates = useMemo(() => {
    if (!searchWord.trim() || !activeTasksForSelect) return [];
    const lowerWord = searchWord.toLowerCase();
    return activeTasksForSelect
        .filter(t => !t.isDeleted && t.name.toLowerCase().includes(lowerWord))
        .slice(0, 10);
  }, [searchWord, activeTasksForSelect]);

  const handleDateClick = () => {
    const input = dateInputRef.current as any;
    if (input) {
      try {
        if (typeof input.showPicker === 'function') {
          input.showPicker();
        } else {
          input.focus();
        }
      } catch (e) {
        input.focus();
      }
    }
  };

  const selectedProject = projects?.find(p => p.id === selectedProjectId);
  const projectName = selectedProject?.projectName || t('project');

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
        <h3 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            {projects && projects.length > 0 ? (
                <div style={{ position: 'relative' }}>
                    <span 
                        onClick={() => setShowProjectSelect(!showProjectSelect)} 
                        style={{ cursor: 'pointer', textDecoration: 'underline dotted', color: 'var(--color-primary)' }}
                    >
                        {projectName}
                    </span>
                    {showProjectSelect && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', zIndex: 10, padding: '4px 0', minWidth: '150px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', maxHeight: '200px', overflowY: 'auto' }}>
                            {projects.map(p => (
                                <div key={p.id} onClick={() => handleProjectChange(p.id)} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-primary)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-item-hover)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    {p.projectName}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <span>{projectName}</span>
            )}
            <span>{t('add_new_task_to_project', { defaultValue: 'に新規タスクを追加' })}</span>
        </h3>
        
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
              onClick={handleDateClick}
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
              ref={dateInputRef}
              type="date" 
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)} 
              style={{ 
                position: 'absolute', top: 0, left: 0, width: 0, height: 0, opacity: 0, pointerEvents: 'none'
              }} 
            />
          </div>

          {activeTasksForSelect && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{t('select_parent_task')}</span>
                {selectedParentId ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-item-hover)', borderRadius: '8px', border: '1px solid var(--color-primary)' }}>
                        <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{getHierarchyName(activeTasksForSelect.find(t => t.id === selectedParentId) || { name: t('unknown') } as any)}</span>
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