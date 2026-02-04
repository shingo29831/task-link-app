import LZString from 'lz-string';
import type { AppData } from '../types';

// ==========================================
// 1. 定数・辞書定義
// ==========================================

const USER_DICTIONARY: Record<string, string> = {
  "確認": "①", 
  "完了": "②", 
  "修正": "③", 
  "【重要】": "④",
  "ミーティング": "⑤",
  "リリース": "⑥",
  "バグ": "⑦",
  "タスク": "⑧",
  "レビュー": "⑨",
  "解消": "⑩"
};

const HIRAGANA_START = 0x3041;
const MAPPING_START = 0x0080;

// ==========================================
// 2. 型定義
// ==========================================

interface CompressedTask {
  i: string; // id (★追加)
  n: string; // name
  s: number; // status
  d?: number;// deadlineOffset
  l: number; // lastUpdated
  p?: string; // parentId (IDを参照)
}

interface CompressedAppData {
  s: number; // projectStartDate
  t: CompressedTask[]; // tasks
  l: number; // lastSynced
}

// ==========================================
// 3. 文字列変換ロジック
// ==========================================

const preProcessString = (str: string): string => {
  let processed = str;
  Object.entries(USER_DICTIONARY).forEach(([key, val]) => {
    processed = processed.split(key).join(val);
  });
  return processed.replace(/[ぁ-ん]/g, (char) => 
    String.fromCharCode(char.charCodeAt(0) - HIRAGANA_START + MAPPING_START)
  );
};

const postProcessString = (str: string): string => {
  let processed = str.replace(/[\u0080-\u00FF]/g, (char) => 
    String.fromCharCode(char.charCodeAt(0) - MAPPING_START + HIRAGANA_START)
  );
  Object.entries(USER_DICTIONARY).forEach(([key, val]) => {
    processed = processed.split(val).join(key);
  });
  return processed;
};

// ==========================================
// 4. メイン圧縮・解凍関数
// ==========================================

export const compressData = (data: AppData): string => {
  try {
    const compressedObj: CompressedAppData = {
      s: data.projectStartDate,
      l: data.lastSynced,
      t: data.tasks.map(t => ({
        i: t.id, // IDはそのまま保存 (短縮ID生成ロジックを入れても良いが今回はそのまま)
        n: preProcessString(t.name),
        s: t.status,
        d: t.deadlineOffset,
        l: t.lastUpdated,
        p: t.parentId // 親IDもそのまま
      }))
    };

    const json = JSON.stringify(compressedObj);
    return LZString.compressToEncodedURIComponent(json);
  } catch (e) {
    console.error("Compression failed", e);
    return "";
  }
};

export const decompressData = (compressedString: string): AppData | null => {
  try {
    const json = LZString.decompressFromEncodedURIComponent(compressedString);
    if (!json) return null;

    const obj = JSON.parse(json) as CompressedAppData;

    return {
      projectStartDate: obj.s,
      lastSynced: obj.l,
      tasks: obj.t.map(t => ({
        id: t.i, // ID復元
        name: postProcessString(t.n),
        status: t.s as 0 | 1 | 2,
        deadlineOffset: t.d,
        lastUpdated: t.l,
        parentId: t.p
      }))
    };
  } catch (e) {
    console.error("Decompression failed", e);
    return null;
  }
};