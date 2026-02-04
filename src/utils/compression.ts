import LZString from 'lz-string';
import type { AppData } from '../types';

const USER_DICTIONARY: Record<string, string> = {
  "確認": "①", "完了": "②", "修正": "③", "【重要】": "④",
  "ミーティング": "⑤", "リリース": "⑥", "バグ": "⑦", "タスク": "⑧"
};

const HIRAGANA_START = 0x3041;
const MAPPING_START = 0x0080;

const preProcess = (str: string): string => {
  let res = str;

  // ★ 追加: 全角アルファベットを半角に変換
  // Unicodeの 0xFF21-0xFF3A (A-Z), 0xFF41-0xFF5A (a-z) を対象
  res = res.replace(/[Ａ-Ｚａ-ｚ]/g, (s) => {
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
  });

  // ユーザー辞書適用
  Object.entries(USER_DICTIONARY).forEach(([k, v]) => res = res.split(k).join(v));

  // ひらがなシフト
  return res.replace(/[ぁ-ん]/g, (c) => String.fromCharCode(c.charCodeAt(0) - HIRAGANA_START + MAPPING_START));
};

// postProcess は変更なし（半角に変換したものは半角のまま復元されます）
const postProcess = (str: string): string => {
  let res = str.replace(/[\u0080-\u00FF]/g, (c) => String.fromCharCode(c.charCodeAt(0) - MAPPING_START + HIRAGANA_START));
  Object.entries(USER_DICTIONARY).forEach(([k, v]) => res = res.split(v).join(k));
  return res;
};

/**
 * 配置順 (Tuple) の定義
 * [0:id, 1:name, 2:status, 3:deadlineOffset(0=無), 4:lastUpdated, 5:parentId(0=無)]
 */
type CompressedTask = [string, string, number, number, number, string | number];
type CompressedAppData = [number, CompressedTask[], number];

const createCompressedArray = (data: AppData): CompressedAppData => [
  data.projectStartDate,
  data.tasks.map(t => [
    t.id,
    preProcess(t.name),
    t.status,
    t.deadlineOffset ?? 0, // ★ 0を未指定として扱う
    t.lastUpdated,
    t.parentId ?? 0        // ★ 0を未指定として扱う
  ]),
  data.lastSynced
];

export const getIntermediateJson = (data: AppData): string => {
  return JSON.stringify(createCompressedArray(data));
};

export const compressData = (data: AppData): string => {
  return LZString.compressToEncodedURIComponent(getIntermediateJson(data));
};

export const decompressData = (compressed: string): AppData | null => {
  try {
    const json = LZString.decompressFromEncodedURIComponent(compressed);
    if (!json) return null;
    const arr = JSON.parse(json) as CompressedAppData;
    return {
      projectStartDate: arr[0],
      tasks: arr[1].map(t => ({
        id: t[0],
        name: postProcess(t[1]),
        status: t[2] as 0 | 1 | 2,
        deadlineOffset: t[3] === 0 ? undefined : t[3], // ★ 0を戻す
        lastUpdated: t[4],
        parentId: (t[5] === 0 || t[5] === "0") ? undefined : (t[5] as string) // ★ 0を戻す
      })),
      lastSynced: arr[2]
    };
  } catch { return null; }
};