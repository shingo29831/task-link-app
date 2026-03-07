// shingo29831/task-link-app/task-link-app-feature-backend/src/components/Icons.tsx
// 役割: アプリケーション全体で使用するSVGアイコンコンポーネントの定義
// なぜ: アイコンのスタイルやサイズを統一的に管理し、再利用性を高めるため

import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
  className?: string;
}

// カレンダー (Calendar)
export const IconCalendar: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

// 閉じる / バツ (Close / X)
export const IconX: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// プラス (Plus)
export const IconPlus: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

// シェブロン 下 (Chevron Down)
export const IconChevronDown: React.FC<IconProps> = ({ size = 16, color = 'currentColor', style, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// シェブロン 右 (Chevron Right)
export const IconChevronRight: React.FC<IconProps> = ({ size = 16, color = 'currentColor', style, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

// シェブロン 左 (Chevron Left)
export const IconChevronLeft: React.FC<IconProps> = ({ size = 16, color = 'currentColor', style, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

// 元に戻す (Undo)
export const IconUndo: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
    <path d="M4 17h13a5 5 0 0 0 0-10H4" />
    <polyline points="8 3 4 7 8 11" />
  </svg>
);

// やり直す (Redo)
export const IconRedo: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
    <path d="M20 17H7a5 5 0 0 1 0-10h13" />
    <polyline points="16 3 20 7 16 11" />
  </svg>
);

// 入出力 (Input / Output)
export const IconInputOutput: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M8 13h8" />
    <polyline points="13 10 16 13 13 16" />
    <path d="M16 17H8" />
    <polyline points="11 14 8 17 11 20" />
  </svg>
);

// リンク (Link)
export const IconLink: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

// 上矢印 (Output 単体)
export const IconArrowUp: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </svg>
);

// 下矢印 (Input 単体)
export const IconArrowDown: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <polyline points="19 12 12 19 5 12" />
  </svg>
);

// ゴミ箱 (Trash)
export const IconTrash: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

// 編集 (Edit)
export const IconEdit: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

// 警告 (Warning)
export const IconWarning: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

// メニュー用キャレット (Caret Down - Filled)
export const IconCaretDown: React.FC<IconProps> = ({ size = 12, color = 'currentColor', style, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none" style={style} className={className}>
    <path d="M7 10l5 5 5-5z" />
  </svg>
);

// ヘルプ (Help)
export const IconHelp: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

// クラウドアップロード (Cloud Upload)
export const IconCloudUpload: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
    <path d="M17.5 19C19.985 19 22 16.985 22 14.5C22 12.164 20.228 10.235 17.957 10.024C17.447 6.6 14.526 4 11 4C7.134 4 4 7.134 4 11C4 11.233 4.011 11.462 4.032 11.687C1.782 12.083 0 14.075 0 16.5C0 19.538 2.462 22 5.5 22H17.5Z"/>
    <path d="M12 17V10"/>
    <path d="M9 13L12 10L15 13"/>
  </svg>
);

// ロード中 (Loader)
export const IconLoader: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style, className = 'spin' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

// チェックサークル (Check Circle)
export const IconCheckCircle: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

// 同期エラー (Error)
export const IconError: React.FC<IconProps> = ({ size = 20, color = 'var(--color-danger)', style, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

// なぜ: 同期がオフ（スナップショット表示中）であることを示すアイコンとして使用するため追加
export const IconCloudOff = ({ size = 24, color = 'currentColor' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22.61 16.95A5 5 0 0 0 18 10h-1.26a8 8 0 0 0-7.05-6M5 5a8 8 0 0 0 4 15h9a5 5 0 0 0 1.7-.3"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);