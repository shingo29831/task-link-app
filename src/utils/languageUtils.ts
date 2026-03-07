// 役割: ブラウザの言語設定を取得・判定するユーティリティ関数群
// なぜ: サイト訪問者の初期言語を適切に設定し、ログイン前のユーザーにも最適な言語環境を提供するため

export const getBrowserLanguage = (): 'ja' | 'en' => {
  if (typeof navigator === 'undefined') return 'ja';

  const browserLang = navigator.language;
  
  if (browserLang && browserLang.toLowerCase().startsWith('ja')) {
    return 'ja';
  }
  
  return 'en';
};