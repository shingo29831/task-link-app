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

// タスク管理で頻出する漢字・記号 (38文字)
// 218(容量) - 86(平) - 91(片) = 41文字分 必要ですが、計算誤差等でオーバーしたため3文字削減します。
// 削減: "秒", "保存", "作成" (または頻度の低いもの)
export const FREQ_KANJI = 
  "日月火水木金土年時分" + // 日付・時間 (10) "秒"削除
  "未着手進行中完了休止" + // ステータス (10)
  "要件詳細優先度期限" + // 管理用語 (8)
  "確認修正追加更新削除" + // アクション (10) "作成""保存"削除
  ""; // 計38文字 (余裕を見て少し減らしました)

// 5. 日本語スーパーセット
export const JP_SUPER_SET = ALL_HIRA + ALL_KATA + FREQ_KANJI;

// 6. Latin-1用バランスセット (128文字)
// 英語混じりの文章などで、ASCIIを温存したい場合に使用
export const JP_BALANCE_128 = 
  "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほ" +
  "まみむめもやゆよらりるれろわをん" +
  "がぎぐげござじずぜぞだでどばびぶべぼっ" +
  "ぁぃぅぇぉゃゅょゎ" + 
  "ーアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ" +
  "マミムメモヤユヨラリルレロワヲン" +
  "ガギグゲゴジズダデドバビブベボプッィェュ" +
  "ァVmX"; // 埋め草

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
  }
];

// ==========================================
// 定義検証 (Validation)
// ==========================================
const MAX_MAPPING_SIZE = 218;

MAPPING_GROUPS.forEach(group => {
  // サイズ超過チェック
  if (group.primary.length > MAX_MAPPING_SIZE) {
    // 超過している場合は末尾を切り詰める（エラーで止まるよりは動作優先）
    console.warn(
      `[MappingDef Warning] Group "${group.name}" primary set length (${group.primary.length}) exceeds ${MAX_MAPPING_SIZE}. Truncating.`
    );
    group.primary = group.primary.substring(0, MAX_MAPPING_SIZE);
  }
  
  if (group.secondary.length > MAX_MAPPING_SIZE) {
    console.warn(
      `[MappingDef Warning] Group "${group.name}" secondary set length (${group.secondary.length}) exceeds ${MAX_MAPPING_SIZE}. Truncating.`
    );
    group.secondary = group.secondary.substring(0, MAX_MAPPING_SIZE);
  }

  // 長さ不一致チェック & 調整
  if (group.primary.length !== group.secondary.length) {
    console.warn(
      `[MappingDef Warning] Group "${group.name}" length mismatch: primary(${group.primary.length}) vs secondary(${group.secondary.length}). Adjusting to smaller size.`
    );
    const minLen = Math.min(group.primary.length, group.secondary.length);
    group.primary = group.primary.substring(0, minLen);
    group.secondary = group.secondary.substring(0, minLen);
  }
});