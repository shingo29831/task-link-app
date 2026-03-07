import React, { useState } from 'react';
import { format } from 'date-fns';
import { ja, enUS } from 'date-fns/locale'; // ▼ 英語ロケールを追加
import { useTranslation } from 'react-i18next'; // ▼ 追加
import type { Task } from '../types';
import { IconX, IconPlus } from './Icons';
import { FormattedTaskName } from './FormattedTaskName';
import { TaskAddModal } from './TaskAddModal';

interface Props {
  date: Date;
  tasks: Task[];
  activeTasks: Task[];
  onClose: () => void;
  onStatusChange: (id: string, status: 0 | 1 | 2 | 3) => void;
  onParentStatusChange: (id: string, status: 0 | 1 | 2 | 3) => void;
  onAddTask: (name: string, dateStr: string, parentId?: string) => void;
}

export const TaskDetailModal: React.FC<Props> = ({ date, tasks, activeTasks, onClose, onStatusChange, onParentStatusChange, onAddTask }) => {
  const { t, i18n } = useTranslation(); // ▼ 追加
  const [statusModalTargetId, setStatusModalTargetId] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDateStr, setNewTaskDateStr] = useState('');

  const handleStatusClick = (task: Task) => {
      if (task.hasChildren) {
          setStatusModalTargetId(task.id);
      } else {
          const next = ((task.status + 1) % 4) as 0 | 1 | 2 | 3;
          onStatusChange(task.id, next);
      }
  };

  const handleOpenAddModal = () => {
    setNewTaskName('');
    setNewTaskDateStr(format(date, 'yyyy-MM-dd'));
    setIsAddModalOpen(true);
  };

  const handleAddTask = (parentId?: string) => {
    onAddTask(newTaskName, newTaskDateStr, parentId);
    setIsAddModalOpen(false);
  };

  const getConfig = (status: number) => ({ 
    0: { l: t('status_todo'), c: 'var(--text-placeholder)' }, 
    1: { l: t('status_doing'), c: 'var(--color-info)' }, 
    2: { l: t('status_done'), c: 'var(--color-success)' }, 
    3: { l: t('status_suspend'), c: 'var(--color-suspend)' } 
  }[status] as any);

  const isEnglish = i18n.language === 'en';
  const formattedDate = format(date, isEnglish ? 'MMM d' : 'M月d日', { locale: isEnglish ? enUS : ja });

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        backgroundColor: 'var(--overlay-bg)', display: 'flex', justifyContent: 'center',
        alignItems: 'center', zIndex: 1000
      }} onClick={onClose}>
        <div style={{
          position: 'relative',
          backgroundColor: 'var(--bg-surface)', 
          borderRadius: '12px', 
          width: '500px', 
          maxWidth: '90%', 
          maxHeight: '85vh', 
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          color: 'var(--text-primary)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }} onClick={e => e.stopPropagation()}>
          
          <div style={{ padding: '30px', overflowY: 'auto', flex: 1, paddingBottom: '80px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.5em' }}>
                {t('task_for_date', { date: formattedDate })}
              </h3>
              <button 
                onClick={onClose} 
                style={{ 
                  padding: '8px', 
                  fontSize: '1.2em', 
                  background: 'transparent', 
                  border: '1px solid var(--border-light)', 
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={t('close')}
              >
                <IconX size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {tasks.length === 0 ? (
                <p style={{ color: 'var(--text-placeholder)', fontSize: '1.1em', textAlign: 'center', margin: '20px 0' }}>
                  {t('no_tasks')}
                </p>
              ) : (
                tasks.map(tData => {
                  const config = getConfig(tData.status);
                  const hasChildren = !!tData.hasChildren;

                  return (
                    <div key={tData.id} style={{
                      padding: '16px', 
                      borderRadius: '6px', 
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      display: 'flex', alignItems: 'center', gap: '12px'
                    }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleStatusClick(tData); }}
                        style={{ 
                          backgroundColor: config.c, 
                          color: '#fff', 
                          minWidth: '80px', 
                          fontSize: '0.9em', 
                          cursor: 'pointer',
                          opacity: hasChildren ? 0.9 : 1, 
                          border: hasChildren ? '1px dashed var(--text-inverse)' : 'none', 
                          padding: '6px 12px',
                          flexShrink: 0
                        }}
                        title={hasChildren ? t('change_parent_status_title') : t('change_status_title')}
                      >
                        {config.l}
                      </button>

                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        {tData.sourceProjectName && (
                            <div style={{ fontSize: '0.85em', opacity: 0.7, fontWeight: 'bold', marginBottom: '2px', color: 'var(--text-secondary)' }}>
                                [{tData.sourceProjectName}]
                            </div>
                        )}
                        <div style={{ 
                          fontSize: '1.1em', 
                          color: 'var(--text-primary)', 
                          textDecoration: tData.status === 2 ? 'line-through' : 'none',
                          wordBreak: 'break-all'
                        }}>
                          <FormattedTaskName name={tData.name} />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <button 
            onClick={(e) => { e.stopPropagation(); handleOpenAddModal(); }} 
            style={{ 
              position: 'absolute', 
              bottom: '20px', 
              right: '20px', 
              width: '56px', 
              height: '56px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--color-primary)', 
              color: 'white', 
              border: 'none', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              opacity: 0.85, 
              cursor: 'pointer',
              zIndex: 100
            }}
            title={t('add_task_title')}
          >
            <IconPlus size={28} />
          </button>
        </div>
      </div>

      {statusModalTargetId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'var(--overlay-bg)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000
        }} onClick={(e) => { e.stopPropagation(); setStatusModalTargetId(null); }}>
          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '20px', borderRadius: '8px', width: '280px', border: '1px solid var(--border-color)', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
            <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>{t('batch_change_status')}</h4>
            <p style={{ fontSize: '0.85em', color: 'var(--text-secondary)', marginBottom: '15px' }}>{t('parent_status_warning')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button onClick={() => { onParentStatusChange(statusModalTargetId, 0); setStatusModalTargetId(null); }} style={{ backgroundColor: 'var(--text-placeholder)', color: '#fff', textAlign: 'left' }}>{t('status_todo_label')}</button>
              <button onClick={() => { onParentStatusChange(statusModalTargetId, 1); setStatusModalTargetId(null); }} style={{ backgroundColor: 'var(--color-info)', color: '#fff', textAlign: 'left' }}>{t('status_doing_label')}</button>
              <button onClick={() => { 
                if(confirm(t('confirm_complete_all_children'))) {
                  onParentStatusChange(statusModalTargetId, 2); 
                  setStatusModalTargetId(null); 
                }
              }} style={{ backgroundColor: 'var(--color-success)', color: '#fff', textAlign: 'left' }}>{t('status_done_label')}</button>
              <button onClick={() => { onParentStatusChange(statusModalTargetId, 3); setStatusModalTargetId(null); }} style={{ backgroundColor: 'var(--color-suspend)', color: '#fff', textAlign: 'left' }}>{t('status_suspend_label')}</button>
            </div>
            <button onClick={() => setStatusModalTargetId(null)} style={{ marginTop: '15px', width: '100%', background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>{t('cancel')}</button>
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <TaskAddModal
          taskName={newTaskName}
          setTaskName={setNewTaskName}
          dateStr={newTaskDateStr}
          setDateStr={setNewTaskDateStr}
          activeTasks={activeTasks}
          onSubmit={handleAddTask}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}
    </>
  );
};