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
  Object.entries(USER_DICTIONARY).forEach(([k, v]) => res = res.split(k).join(v));
  return res.replace(/[ぁ-ん]/g, (c) => String.fromCharCode(c.charCodeAt(0) - HIRAGANA_START + MAPPING_START));
};

const postProcess = (str: string): string => {
  let res = str.replace(/[\u0080-\u00FF]/g, (c) => String.fromCharCode(c.charCodeAt(0) - MAPPING_START + HIRAGANA_START));
  Object.entries(USER_DICTIONARY).forEach(([k, v]) => res = res.split(v).join(k));
  return res;
};

/**
 * 配置順の定義 (Tuple Structure)
 * Task: [0:id, 1:name, 2:status, 3:deadlineOffset, 4:lastUpdated, 5:parentId]
 * App:  [0:projectStartDate, 1:tasksArray, 2:lastSynced]
 */
type CompressedTask = [string, string, number, number | null, number, string | null];
type CompressedAppData = [number, CompressedTask[], number];

const createCompressedArray = (data: AppData): CompressedAppData => [
  data.projectStartDate,
  data.tasks.map(t => [
    t.id,
    preProcess(t.name),
    t.status,
    t.deadlineOffset ?? null,
    t.lastUpdated,
    t.parentId ?? null
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
        deadlineOffset: t[3] ?? undefined,
        lastUpdated: t[4],
        parentId: t[5] ?? undefined
      })),
      lastSynced: arr[2]
    };
  } catch { return null; }
};