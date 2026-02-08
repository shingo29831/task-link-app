// src/utils/mappingDefinitions.ts

// 1バイト領域 (0x0080 - 0x00FF) の開始位置（Latin-1補助）
export const LATIN1_START = 0x0080;

// ==========================================
// 文字セット定義
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


// 4. 日本語文字セットソース
export const ALL_HIRA = Array.from({ length: 86 }, (_, i) => String.fromCharCode(0x3041 + i)).join(''); // ぁ-ゖ (86文字)
export const ALL_KATA = Array.from({ length: 90 }, (_, i) => String.fromCharCode(0x30A1 + i)).join('') + 'ー'; // ァ-ヺ+ー (91文字)

export const FREQ_KANJI_41 = 
  "未中済完了待留急高低要締限始終確認決調考作送受見改写案件問備予自他主続休報連相会議"; //41


export const FREQ_KANJI_CULTURE_132 = 
  "日一十二本人大年三会中" + // 1-11
  "国長出五時行事生四間上" + // 12-22
  "分学的手後見下自地部者" + // 23-33
  "子東円同高社合前立内方" + // 34-44
  "代場理名家業発小新対月" + // 45-55
  "定気実力関体回政民動当" + // 56-66
  "法全明八野用市所通主相" + // 67-77
  "外文言機山不京作度校多" + // 78-88
  "道現公無海九問連員化物" + // 89-99
  "最表水意性教点正木利原" + // 100-110
  "書田近百先知平六話保万" + // 111-121
  "元工取今千金私支和売七";  // 122-132


// 5. 日本語スーパーセット
export const JP_SUPER_SET = ALL_HIRA + ALL_KATA + FREQ_KANJI_41;

// 6. Latin-1用バランスセット (128文字)
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
// マッピンググループ定義
// ==========================================

export interface MappingGroup {
  name: string;
  primary: string;   
  secondary: string; 
}

export const MAPPING_GROUPS: MappingGroup[] = [
  // Group 0: SUPER SWAP (Max 218 chars)
  {
    name: "SUPER_JP_MIX",
    primary: JP_SUPER_SET,
    secondary: SWAP_COMBINED
  },
  // Group 1: LATIN1 BALANCE (128 chars)
  {
    name: "LATIN1_SAFE",
    primary: JP_BALANCE_128,
    secondary: SWAP_LATIN1
  },
  // ★追加 Group 2: CULTURE_FREQ_JP (Max 218 chars)
  // ひらがな(86) + 頻出漢字(132) = 218文字
  // カタカナを含まない代わりに、漢字のカバー率を大幅に向上させたセット
  {
    name: "CULTURE_FREQ_JP",
    primary: ALL_HIRA + FREQ_KANJI_CULTURE_132,
    secondary: SWAP_COMBINED
  }
];

// ==========================================
// 定義検証 (Validation)
// ==========================================
const MAX_MAPPING_SIZE = 218;

MAPPING_GROUPS.forEach(group => {
  // 1. 最大文字数制限のチェック
  if (group.primary.length > MAX_MAPPING_SIZE) {
    throw new Error(
      `[MappingDef Error] Group "${group.name}" primary set length (${group.primary.length}) exceeds maximum allowed size of ${MAX_MAPPING_SIZE}.`
    );
  }
  
  if (group.secondary.length > MAX_MAPPING_SIZE) {
    throw new Error(
      `[MappingDef Error] Group "${group.name}" secondary set length (${group.secondary.length}) exceeds maximum allowed size of ${MAX_MAPPING_SIZE}.`
    );
  }

  // 2. primary と secondary の文字数一致チェック
  if (group.primary.length !== group.secondary.length) {
    throw new Error(
      `[MappingDef Error] Group "${group.name}" has a length mismatch: primary(${group.primary.length}) and secondary(${group.secondary.length}) must be the same length.`
    );
  }

  // 3. (オプション) 重複チェック: スワップが正しく行われるよう、文字セット内で文字が重複していないか
  const checkDuplicate = (str: string, label: string) => {
    const chars = Array.from(str);
    const uniqueChars = new Set(chars);
    if (chars.length !== uniqueChars.size) {
      // 重複文字を特定してエラーメッセージに含める
      const dup = chars.filter((item, index) => chars.indexOf(item) !== index);
      throw new Error(`[MappingDef Error] Group "${group.name}" contains duplicate characters in ${label}: ${Array.from(new Set(dup)).join(', ')}`);
    }
  };
  
  checkDuplicate(group.primary, "primary set");
  checkDuplicate(group.secondary, "secondary set");
});