import LZString from 'lz-string';
import type { AppData } from '../types';

const USER_DICTIONARY: Record<string, string> = {
  "確認": "①", "完了": "②", "修正": "③", "【重要】": "④",
  "ミーティング": "⑤", "リリース": "⑥", "バグ": "⑦", "タスク": "⑧"
};

const HIRAGANA_START = 0x3041;
const MAPPING_START = 0x0080;

const preProcess = (str: string): string => {
  let res = str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
  Object.entries(USER_DICTIONARY).forEach(([k, v]) => res = res.split(k).join(v));
  return res.replace(/[ぁ-ん]/g, (c) => String.fromCharCode(c.charCodeAt(0) - HIRAGANA_START + MAPPING_START));
};

const postProcess = (str: string): string => {
  let res = str.replace(/[\u0080-\u00FF]/g, (c) => String.fromCharCode(c.charCodeAt(0) - MAPPING_START + HIRAGANA_START));
  Object.entries(USER_DICTIONARY).forEach(([k, v]) => res = res.split(v).join(k));
  return res;
};

// 配置順: [0:name, 1:status, 2:deadlineOffset, 3:lastUpdated, 4:parentId]
// 削除済みは []
type CompressedTask = [string, number, number, number, string | number] | [];
type CompressedAppData = [number, CompressedTask[], number];

const createCompressedArray = (data: AppData): CompressedAppData => [
  data.projectStartDate,
  data.tasks.map(t => t.isDeleted ? [] : [ // ★ 削除済みは空配列
    preProcess(t.name),
    t.status,
    t.deadlineOffset ?? 0,
    t.lastUpdated,
    t.parentId ?? 0
  ]),
  data.lastSynced
];

export const getIntermediateJson = (data: AppData): string => JSON.stringify(createCompressedArray(data));

export const compressData = (data: AppData): string => LZString.compressToEncodedURIComponent(getIntermediateJson(data));

export const decompressData = (compressed: string): AppData | null => {
  try {
    const json = LZString.decompressFromEncodedURIComponent(compressed);
    if (!json) return null;
    const arr = JSON.parse(json) as CompressedAppData;
    return {
      projectStartDate: arr[0],
      tasks: arr[1].map((t, index) => {
        const id = (index + 1).toString(36); // ★ 並び順からIDを復元
        if (Array.isArray(t) && t.length === 0) {
          return { id, name: "", status: 0, lastUpdated: 0, isDeleted: true };
        }
        const task = t as any[];
        return {
          id,
          name: postProcess(task[0]),
          status: task[1] as 0|1|2,
          deadlineOffset: task[2] === 0 ? undefined : task[2],
          lastUpdated: task[3],
          parentId: (task[4] === 0 || task[4] === "0") ? undefined : String(task[4])
        };
      }),
      lastSynced: arr[2]
    };
  } catch { return null; }
};