import React, { useState } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next'; // ▼ 追加
import type { Task } from '../types';

interface Props {
  task: Task;
  hasChildren: boolean;
  onClose: () => void;
  onSave: (name: string, dateStr: string, status: 0 | 1 | 2 | 3) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export const TaskEditModal: React.FC<Props> = ({
  task,
  hasChildren,
  onClose,
  onSave,
  onDelete,
  onMoveUp,
  onMoveDown
}) => {
  const { t } = useTranslation(); // ▼ 追加
  const [name, setName] = useState(task.name);
  const initialDate = task.deadline ? format(new Date(task.deadline), 'yyyy-MM-dd') : '';
  const [dateStr, setDateStr] = useState(initialDate);
  const [status, setStatus] = useState<0 | 1 | 2 | 3>(task.status as 0 | 1 | 2 | 3);
  
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSaveClick = () => {
    if (hasChildren && status !== task.status) {
      setShowConfirm(true);
    } else {
      onSave(name, dateStr, status);
    }
  };

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 4000, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={onClose}>
        <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: '8px', width: '320px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
          <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2em' }}>{t('task_details')}</h3>
          
          <div>
            <label style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>{t('task_name')}</label>
            <textarea 
              value={name} 
              onChange={e => setName(e.target.value)} 
              autoFocus 
              style={{ 
                width: '100%', 
                padding: '8px', 
                boxSizing: 'border-box', 
                marginTop: '4px', 
                borderRadius: '4px', 
                border: '1px solid var(--border-color)', 
                background: 'var(--bg-input)', 
                color: 'var(--text-primary)',
                minHeight: '80px',
                maxHeight: '200px',
                resize: 'vertical',
                overflowY: 'auto',
                fontFamily: 'inherit',
                fontSize: '1em'
              }} 
            />
          </div>

          <div>
            <label style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>{t('deadline')}</label>
            <input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} style={{ width: '100%', padding: '8px', boxSizing: 'border-box', marginTop: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', colorScheme: 'dark' }} />
          </div>

          {hasChildren && (
            <div>
              <label style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>{t('status_batch_change')}</label>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '8px', 
                marginTop: '4px' 
              }}>
                <button onClick={() => setStatus(0)} style={{ padding: '8px', borderRadius: '4px', cursor: 'pointer', boxSizing: 'border-box', fontWeight: 'bold', backgroundColor: 'var(--text-placeholder)', color: '#fff', border: status === 0 ? '2px solid var(--text-primary)' : '2px solid transparent', opacity: status === 0 ? 1 : 0.5 }}>{t('status_todo')}</button>
                <button onClick={() => setStatus(1)} style={{ padding: '8px', borderRadius: '4px', cursor: 'pointer', boxSizing: 'border-box', fontWeight: 'bold', backgroundColor: 'var(--color-info)', color: '#fff', border: status === 1 ? '2px solid var(--text-primary)' : '2px solid transparent', opacity: status === 1 ? 1 : 0.5 }}>{t('status_doing')}</button>
                <button onClick={() => setStatus(2)} style={{ padding: '8px', borderRadius: '4px', cursor: 'pointer', boxSizing: 'border-box', fontWeight: 'bold', backgroundColor: 'var(--color-success)', color: '#fff', border: status === 2 ? '2px solid var(--text-primary)' : '2px solid transparent', opacity: status === 2 ? 1 : 0.5 }}>{t('status_done')}</button>
                <button onClick={() => setStatus(3)} style={{ padding: '8px', borderRadius: '4px', cursor: 'pointer', boxSizing: 'border-box', fontWeight: 'bold', backgroundColor: 'var(--color-suspend)', color: '#fff', border: status === 3 ? '2px solid var(--text-primary)' : '2px solid transparent', opacity: status === 3 ? 1 : 0.5 }}>{t('status_suspend')}</button>
              </div>
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>{t('change_order')}</label>
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button onClick={onMoveUp} style={{ flex: 1, padding: '8px', background: 'var(--bg-button)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer' }}>{t('move_up')}</button>
              <button onClick={onMoveDown} style={{ flex: 1, padding: '8px', background: 'var(--bg-button)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer' }}>{t('move_down')}</button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', alignItems: 'center' }}>
            <button onClick={onDelete} style={{ padding: '6px 12px', background: 'transparent', color: 'var(--color-danger-text)', border: '1px solid var(--color-danger-text)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em' }}>{t('delete')}</button>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={onClose} style={{ padding: '6px 12px', background: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontSize: '0.9em' }}>{t('cancel')}</button>
              <button onClick={handleSaveClick} style={{ padding: '6px 16px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em', fontWeight: 'bold' }}>{t('save')}</button>
            </div>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 4001, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => setShowConfirm(false)}>
          <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: '8px', width: '320px', boxShadow: '0 4px 20px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', gap: '16px' }} onClick={e => e.stopPropagation()}>
            <h4 style={{ margin: 0, color: 'var(--color-danger-text)', fontSize: '1.1em' }}>{t('confirm_child_change_title')}</h4>
            <p style={{ margin: 0, fontSize: '0.9em', color: 'var(--text-primary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
              {t('confirm_child_change_desc')}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button onClick={() => setShowConfirm(false)} style={{ padding: '8px 16px', background: 'var(--bg-button)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer' }}>{t('cancel')}</button>
              <button onClick={() => { setShowConfirm(false); onSave(name, dateStr, status); }} style={{ padding: '8px 16px', background: 'var(--color-danger)', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>{t('confirm_change')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};