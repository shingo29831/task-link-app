import LZString from 'lz-string';
import type { AppData } from '../types';

const USER_DICTIONARY: Record<string, string> = {
  "確認": "①", "完了": "②", "修正": "③", "【重要】": "④",
  "ミーティング": "⑤", "リリース": "⑥", "バグ": "⑦", "タスク": "⑧"
};

const HIRAGANA_START = 0x3041;
const MAPPING_START = 0x0080;

interface CompressedTask {
  i: string; n: string; s: number; d?: number; l: number; p?: string;
}

interface CompressedAppData {
  s: number; t: CompressedTask[]; l: number;
}

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

export const compressData = (data: AppData): string => {
  const obj: CompressedAppData = {
    s: data.projectStartDate, l: data.lastSynced,
    t: data.tasks.map(t => ({ i: t.id, n: preProcess(t.name), s: t.status, d: t.deadlineOffset, l: t.lastUpdated, p: t.parentId }))
  };
  return LZString.compressToEncodedURIComponent(JSON.stringify(obj));
};

export const decompressData = (compressed: string): AppData | null => {
  try {
    const json = LZString.decompressFromEncodedURIComponent(compressed);
    if (!json) return null;
    const obj = JSON.parse(json) as CompressedAppData;
    return {
      projectStartDate: obj.s, lastSynced: obj.l,
      tasks: obj.t.map(t => ({ id: t.i, name: postProcess(t.n), status: t.s as 0|1|2, deadlineOffset: t.d, lastUpdated: t.l, parentId: t.p }))
    };
  } catch { return null; }
};