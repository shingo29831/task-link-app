import LZString from 'lz-string';
import type { AppData } from '../types';

// 2020-01-01 00:00:00 UTC を基準点 (0分) とする
const EPOCH_2020_MIN = 26297280;

const USER_DICTIONARY: Record<string, string> = {
  "確認": "①", "完了": "②", "修正": "③", "【重要】": "④",
  "ミーティング": "⑤", "リリース": "⑥", "バグ": "⑦", "タスク": "⑧"
};

const HIRAGANA_START = 0x3041;
const MAPPING_START = 0x0080;

const preProcess = (str: string): string => {
  let res = str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
  res = res.replace(/\[/g, '［').replace(/\]/g, '］').replace(/,/g, '，');
  Object.entries(USER_DICTIONARY).forEach(([k, v]) => res = res.split(k).join(v));
  return res.replace(/[ぁ-ん]/g, (c) => String.fromCharCode(c.charCodeAt(0) - HIRAGANA_START + MAPPING_START));
};

const postProcess = (str: string): string => {
  let res = str.replace(/[\u0080-\u00FF]/g, (c) => String.fromCharCode(c.charCodeAt(0) - MAPPING_START + HIRAGANA_START));
  Object.entries(USER_DICTIONARY).forEach(([k, v]) => res = res.split(v).join(k));
  res = res.replace(/［/g, '[').replace(/］/g, ']').replace(/，/g, ',');
  return res;
};

export const getIntermediateJson = (data: AppData): string => {
  const start = Math.floor(data.projectStartDate / 60000 - EPOCH_2020_MIN).toString(36);
  const end = Math.floor(data.lastSynced / 60000 - EPOCH_2020_MIN).toString(36);
  
  const tasksStr = data.tasks.map(t => {
    if (t.isDeleted) return "[";
    
    // ★ 0 の場合は空文字列にする最適化
    const name = preProcess(t.name);
    const status = t.status === 0 ? "" : t.status;
    const deadline = (t.deadlineOffset === 0 || t.deadlineOffset === undefined) ? "" : t.deadlineOffset;
    const updated = Math.floor(t.lastUpdated / 60000 - EPOCH_2020_MIN).toString(36);
    const parent = (t.parentId === "0" || !t.parentId) ? "" : t.parentId;
    
    return `[${name},${status},${deadline},${updated},${parent}`;
  }).join('');

  return `${start}${tasksStr}]${end}`;
};

export const compressData = (data: AppData): string => {
  return LZString.compressToEncodedURIComponent(getIntermediateJson(data));
};

export const decompressData = (compressed: string): AppData | null => {
  try {
    const raw = LZString.decompressFromEncodedURIComponent(compressed);
    if (!raw) return null;

    const firstIdx = raw.indexOf('[');
    const lastIdx = raw.lastIndexOf(']');

    if (firstIdx === -1) {
      const sepIdx = raw.indexOf(']');
      return {
        projectStartDate: (parseInt(raw.substring(0, sepIdx), 36) + EPOCH_2020_MIN) * 60000,
        tasks: [],
        lastSynced: (parseInt(raw.substring(sepIdx + 1), 36) + EPOCH_2020_MIN) * 60000
      };
    }

    const startDate = (parseInt(raw.substring(0, firstIdx), 36) + EPOCH_2020_MIN) * 60000;
    const lastSynced = (parseInt(raw.substring(lastIdx + 1), 36) + EPOCH_2020_MIN) * 60000;
    const tasksBody = raw.substring(firstIdx, lastIdx);
    const taskStrings = tasksBody.split('[').slice(1);

    return {
      projectStartDate: startDate,
      tasks: taskStrings.map((tStr, index) => {
        const id = (index + 1).toString(36);
        if (tStr === "") return { id, name: "", status: 0, lastUpdated: 0, isDeleted: true };
        
        const parts = tStr.split(',');
        return {
          id,
          name: postProcess(parts[0]),
          // ★ 空文字列を 0 または undefined に復元
          status: (parts[1] === "" ? 0 : Number(parts[1])) as 0 | 1 | 2,
          deadlineOffset: parts[2] === "" ? undefined : Number(parts[2]),
          lastUpdated: (parseInt(parts[3], 36) + EPOCH_2020_MIN) * 60000,
          parentId: parts[4] === "" ? undefined : parts[4]
        };
      }),
      lastSynced: lastSynced
    };
  } catch (e) {
    return null;
  }
};