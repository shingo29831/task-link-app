// src/utils/mappingDefinitions.ts

// 1バイト領域 (0x0080 - 0x00FF) の開始位置（Latin-1補助）
export const LATIN1_START = 0x0080;

// ==========================================
// 文字セット定義
// ==========================================

// 1. スワップ用 ASCII文字セット (75文字)
// 制御文字や、構造に使われる , - [ ] \ を除外した、安全かつ頻出する英数字記号
export const SWAP_ASCII = 
  "abcdefghijklmnopqrstuvwxyz" +
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
  "0123456789" +
  "!#$%&()*+./:;<=>?@^_";

// 2. スワップ用 Latin-1文字セット (128文字)
// 0x0080 - 0x00FF の全領域
export const SWAP_LATIN1 = Array.from({ length: 128 }, (_, i) => String.fromCharCode(LATIN1_START + i)).join('');

// 3. 日本語文字セットソース
export const ALL_HIRA = Array.from({ length: 86 }, (_, i) => String.fromCharCode(0x3041 + i)).join(''); // ぁ-ゖ
export const ALL_KATA = Array.from({ length: 90 }, (_, i) => String.fromCharCode(0x30A1 + i)).join('') + 'ー'; // ァ-ヺ+ー

// Group 2用: バランス型日本語セット (128文字)
// ひらがな64文字 + カタカナ64文字
export const JP_BALANCE_128 = 
  "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほ" +
  "まみむめもやゆよらりるれろわをん" +
  "がぎぐげござじずぜぞだでどばびぶべぼっ" +
  "ーアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ" +
  "マミムメモヤユヨラリルレロワヲン" +
  "ガギグゲゴジズダデドバビブベボプッィェュ";

// ==========================================
// マッピンググループ定義
// ==========================================

export interface MappingGroup {
  name: string;
  primary: string;   // データ内で優先的に使いたい文字セット (例: 日本語)
  secondary: string; // データ内では避けたいが、置換先として使う文字セット (例: ASCII, Latin1)
}

export const MAPPING_GROUPS: MappingGroup[] = [
  // Group 0: ASCII-Hiragana Swap
  // 日本語入力メインの場合に有効。ひらがなを1バイトの英数字に置換。
  {
    name: "ASCII_HIRAGANA",
    // 頻出ひらがな75文字 (全86文字から先頭75文字を取得)
    primary: ALL_HIRA.slice(0, 75), 
    secondary: SWAP_ASCII
  },
  // Group 1: ASCII-Katakana Swap
  // カタカナ語が多い場合に有効。
  {
    name: "ASCII_KATAKANA",
    // カタカナから小文字を除外して頻出順を高めた75文字を生成する簡易ロジック
    // (ここでは単純に小文字を削除して詰める処理をしています)
    primary: ALL_KATA.replace(/[ァィゥェォッャュョ]/g, '').slice(0, 75),
    secondary: SWAP_ASCII
  },
  // Group 2: Latin1-Balance Swap (Safe Fallback)
  // 英数字も日本語も多い場合に、日本語をLatin-1に逃がす。
  {
    name: "LATIN1_BALANCE",
    primary: JP_BALANCE_128,
    secondary: SWAP_LATIN1
  }
];