// src/utils/mappingDefinitions.ts

// 1バイト領域 (0x0080 - 0x00FF) の開始位置（Latin-1補助）
export const LATIN1_START = 0x0080;

// ==========================================
// 文字セット定義 (バージョン共通)
// ==========================================

// 1. スワップ用 ASCII文字セット (90文字)
// 印字可能文字(33-126)から、構造上危険な文字を除外した全て
// 除外: ,(44) [(91) \(92) ](93)
export const SWAP_ASCII = (() => {
  let s = "";
  for (let i = 33; i <= 126; i++) {
    if (i === 44 || i === 91 || i === 92 || i === 93) continue;
    s += String.fromCharCode(i);
  }
  return s;
})();

// 2. スワップ用 Latin-1文字セット (128文字)
// 0x0080 - 0x00FF の全領域
export const SWAP_LATIN1 = Array.from({ length: 128 }, (_, i) => String.fromCharCode(LATIN1_START + i)).join('');

// 3. 結合スワップセット (218文字)
// ASCII(90) + Latin1(128)
export const SWAP_COMBINED = SWAP_ASCII + SWAP_LATIN1;


// 4. 日本語文字セットソース (基本文字)
export const ALL_HIRA = Array.from({ length: 86 }, (_, i) => String.fromCharCode(0x3041 + i)).join(''); // ぁ-ゖ (86文字)
export const ALL_KATA = Array.from({ length: 90 }, (_, i) => String.fromCharCode(0x30A1 + i)).join('') + 'ー'; // ァ-ヺ+ー (91文字)

// 5. Latin-1用バランスセット (128文字)
// 英語混じりの文章などで、ASCIIを温存したい場合に使用
export const JP_BALANCE_128 = 
  "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほ" + // 30
  "まみむめもやゆよらりるれろわをん" + // 15
  "がぎぐげござじずぜぞだでどばびぶべぼっ" + // 20
  "ぁぃぅぇぉゃゅょ" + // 8
  "ーアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ" + // 31
  "マミムメモヤユヨラリルレロワヲン" + // 15
  "ガギグゲゴバビブ";

// ==========================================
// 型定義
// ==========================================

export interface MappingGroup {
  name: string;
  primary: string;   
  secondary: string; 
}