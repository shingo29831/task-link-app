// 役割: クラウド同期の上限に達した際に、同期を継続するプロジェクトを選択させるモーダル
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export const SyncLimitModal = ({ limitState, onResolve }: { limitState: any, onResolve: (ids: string[]) => void }) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string[]>([]);
  
  const toggle = (id: string) => {
     if (selected.includes(id)) setSelected(prev => prev.filter(x => x !== id));
     else if (selected.length < limitState.limit) setSelected(prev => [...prev, id]);
  };

  return (
     <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{background: 'var(--bg-surface)', padding: '24px', borderRadius: '12px', maxWidth: '500px', width: '90%', boxShadow: '0 8px 30px rgba(0,0,0,0.5)'}}>
           <h3 style={{ color: 'var(--color-danger-text)', marginTop: 0 }}>⚠️ {t('sync_limit_title', 'クラウド同期の上限を超えています')}</h3>
           <p style={{ color: 'var(--text-primary)', fontSize: '0.95em', lineHeight: 1.5 }}>
             {t('sync_limit_desc_1', '現在のプランの同期上限は')} <strong>{limitState.limit}{t('count_unit', '件')}</strong> {t('sync_limit_desc_2', 'ですが、クラウド上に')} {limitState.cloudProjects.length}{t('count_unit', '件')} {t('sync_limit_desc_3', 'のデータが見つかりました。')}
           </p>
           <p style={{ color: 'var(--text-secondary)', fontSize: '0.85em', marginBottom: '20px' }}>
             {t('sync_limit_instruction', `同期を継続するプロジェクトを ${limitState.limit}件 選んでください。（選ばれなかったものはオフラインのローカルデータに切り替わります）`)}
           </p>
           
           <div style={{maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '10px', marginBottom: '20px'}}>
              {limitState.cloudProjects.map((p: any) => (
                 <label key={p.id} style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', opacity: (!selected.includes(p.id) && selected.length >= limitState.limit) ? 0.5 : 1}}>
                    <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} disabled={!selected.includes(p.id) && selected.length >= limitState.limit} style={{ transform: 'scale(1.2)' }} />
                    <span style={{ color: 'var(--text-primary)' }}>{p.projectName}</span>
                 </label>
              ))}
           </div>
           
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <span style={{ fontSize: '0.9em', color: selected.length === limitState.limit ? 'var(--color-primary)' : 'var(--text-secondary)' }}>
                {t('sync_limit_selected', '選択中')}: {selected.length} / {limitState.limit}{t('count_unit', '件')}
             </span>
             <button onClick={() => onResolve(selected)} disabled={selected.length === 0} style={{ padding: '10px 20px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: selected.length === 0 ? 'not-allowed' : 'pointer', opacity: selected.length === 0 ? 0.5 : 1 }}>
               {t('decide', '決定する')}
             </button>
           </div>
        </div>
     </div>
  );
};