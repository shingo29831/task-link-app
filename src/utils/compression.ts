import LZString from 'lz-string';
import type { AppData } from '../types';

// ==========================================
// 1. 定数・辞書定義
// ==========================================

// 頻出ワード辞書（ユーザー定義）
const USER_DICTIONARY: Record<string, string> = {
  "確認": "①", 
  "完了": "②", 
  "修正": "③", 
  "【重要】": "④",
  "ミーティング": "⑤",
  "リリース": "⑥",
  "バグ": "⑦"
};

// ひらがな圧縮用のマッピング定数
const HIRAGANA_START = 0x3041; // 'ぁ'
const MAPPING_START = 0x0080;  // 1バイト文字領域の空き場所へ

// ==========================================
// 2. 型定義（圧縮用：キーを1文字にしたもの）
// ==========================================

interface CompressedTask {
  n: string; // name (ID)
  s: number; // status
  d?: number;// deadlineOffset
  l: number; // lastUpdated
}

interface CompressedAppData {
  s: number; // projectStartDate
  t: CompressedTask[]; // tasks
  l: number; // lastSynced
}

// ==========================================
// 3. 文字列変換ロジック（辞書 & ひらがな）
// ==========================================

// 文字列の前処理（辞書置換 -> ひらがなシフト）
const preProcessString = (str: string): string => {
  let processed = str;
  // ユーザー辞書適用
  Object.entries(USER_DICTIONARY).forEach(([key, val]) => {
    processed = processed.split(key).join(val);
  });
  // ひらがな -> 1バイト文字
  return processed.replace(/[ぁ-ん]/g, (char) => 
    String.fromCharCode(char.charCodeAt(0) - HIRAGANA_START + MAPPING_START)
  );
};

// 文字列の復元（ひらがなシフト戻し -> 辞書逆置換）
const postProcessString = (str: string): string => {
  // 1バイト文字 -> ひらがな
  // \u0080-\u00FF の範囲を検出して戻す
  let processed = str.replace(/[\u0080-\u00FF]/g, (char) => 
    String.fromCharCode(char.charCodeAt(0) - MAPPING_START + HIRAGANA_START)
  );
  // ユーザー辞書逆適用
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
    // データを圧縮用構造（短いキー）に変換
    const compressedObj: CompressedAppData = {
      s: data.projectStartDate,
      l: data.lastSynced,
      t: data.tasks.map(t => ({
        n: preProcessString(t.name), // タスク名に独自圧縮適用
        s: t.status,
        d: t.deadlineOffset,
        l: t.lastUpdated
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

    // データをアプリ用構造（通常のキー）に復元
    return {
      projectStartDate: obj.s,
      lastSynced: obj.l,
      tasks: obj.t.map(t => ({
        name: postProcessString(t.n), // タスク名を復元
        status: t.s as 0 | 1 | 2,
        deadlineOffset: t.d,
        lastUpdated: t.l
      }))
    };
  } catch (e) {
    console.error("Decompression failed", e);
    return null;
  }
};