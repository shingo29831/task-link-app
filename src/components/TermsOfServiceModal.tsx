// src/components/TermsOfServiceModal.tsx
// 役割: 利用規約を表示するモーダル。テキストは定数ファイルから取得。
import React from 'react';
import { useTranslation } from 'react-i18next';
import { TERMS_OF_SERVICE, type LegalArticle } from '../constants/legal';

interface Props {
  onClose: () => void;
}

export const TermsOfServiceModal: React.FC<Props> = ({ onClose }) => {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language.startsWith('ja') ? 'ja' : 'en') as 'ja' | 'en';
  const content = TERMS_OF_SERVICE[lang];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
      <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: '8px', width: '600px', maxWidth: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', color: 'var(--text-primary)' }}>
        <h2 style={{ marginTop: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>{t('terms_of_service')}</h2>
        
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px', fontSize: '0.9em', lineHeight: '1.6' }}>
          <p>{content.intro}</p>

          {content.articles.map((article: LegalArticle, index: number) => (
            <div key={index}>
              <h3>{article.title}</h3>
              {article.desc && <p>{article.desc}</p>}
              {article.items && article.items.length > 0 && (
                <ol>
                  {article.items.map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                </ol>
              )}
              {article.postDesc && <p>{article.postDesc}</p>}
            </div>
          ))}
        </div>

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
          <button onClick={onClose} style={{ padding: '8px 24px', background: 'var(--color-primary)', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
};