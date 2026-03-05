// 役割: 文字列の幅計算や文字種判定などのテキスト処理ユーティリティ

export const getCharWidth = (str: string) => {
  let width = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if ((c >= 0x0 && c <= 0x7f) || (c >= 0xff61 && c <= 0xff9f)) width += 1;
    else width += 2;
  }
  return width;
};

export const getCharClass = (c: string) => {
  if (/[ \-_/.=　]/.test(c)) return 'symbol';
  if (/[a-zａ-ｚ]/.test(c)) return 'lower';
  if (/[A-ZＡ-Ｚ]/.test(c)) return 'upper';
  if (/[0-9０-９]/.test(c)) return 'num';
  if (/[\u3040-\u309F]/.test(c)) return 'hiragana';
  if (/[\u30A0-\u30FF\uFF65-\uFF9F]/.test(c)) return 'katakana';
  if (/[\u4E00-\u9FFF]/.test(c)) return 'kanji';
  return 'other';
};

export const getCharGroup = (charClass: string) => {
  if (['lower', 'upper'].includes(charClass)) return 'alpha';
  if (charClass === 'num') return 'num';
  if (['hiragana', 'katakana', 'kanji'].includes(charClass)) return 'japanese';
  if (charClass === 'symbol') return 'symbol';
  return 'other';
};