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
  // 区切り文字として使う記号（[ ] ,）がタスク名にあると復元できないため全角に置換
  res = res.replace(/\[/g, '［').replace(/\]/g, '］').replace(/,/g, '，');
  Object.entries(USER_DICTIONARY).forEach(([k, v]) => res = res.split(k).join(v));
  return res.replace(/[ぁ-ん]/g, (c) => String.fromCharCode(c.charCodeAt(0) - HIRAGANA_START + MAPPING_START));
};

const postProcess = (str: string): string => {
  let res = str.replace(/[\u0080-\u00FF]/g, (c) => String.fromCharCode(c.charCodeAt(0) - MAPPING_START + HIRAGANA_START));
  Object.entries(USER_DICTIONARY).forEach(([k, v]) => res = res.split(v).join(k));
  // 全角に逃がしていた記号を半角に戻す
  res = res.replace(/［/g, '[').replace(/］/g, ']').replace(/，/g, ',');
  return res;
};

// デバッグ・圧縮用：ブラケット、カンマ、クォートを徹底的に削った文字列を生成
export const getIntermediateJson = (data: AppData): string => {
  const start = data.projectStartDate.toString();
  const end = data.lastSynced.toString();
  
  // JSON.stringifyを使わず、nameの引用符を除去したカスタム配列形式で結合
  const tasks = data.tasks.map(t => {
    if (t.isDeleted) return "[]";
    // 形式: [名前,状態,期限Offset,最終更新,親ID]
    return `[${preProcess(t.name)},${t.status},${t.deadlineOffset ?? 0},${t.lastUpdated},${t.parentId ?? 0}]`;
  }).join(''); // タスク間のカンマも消去

  return `${start}${tasks}${end}`;
};

export const compressData = (data: AppData): string => {
  return LZString.compressToEncodedURIComponent(getIntermediateJson(data));
};

export const decompressData = (compressed: string): AppData | null => {
  try {
    const raw = LZString.decompressFromEncodedURIComponent(compressed);
    if (!raw) return null;

    // 数値[...][...]数値 の形式から分割
    const firstIdx = raw.indexOf('[');
    const lastIdx = raw.lastIndexOf(']');

    if (firstIdx === -1) {
      const ts = raw.match(/\d{13}/g);
      return { projectStartDate: Number(ts?.[0]), tasks: [], lastSynced: Number(ts?.[1]) };
    }

    const startDate = Number(raw.substring(0, firstIdx));
    const lastSynced = Number(raw.substring(lastIdx + 1));
    const tasksBody = raw.substring(firstIdx, lastIdx + 1);

    // [ ] のペアを抽出
    const taskStrings = tasksBody.match(/\[.*?\]/g) || [];

    return {
      projectStartDate: startDate,
      tasks: taskStrings.map((tStr, index) => {
        const id = (index + 1).toString(36);
        if (tStr === "[]") return { id, name: "", status: 0, lastUpdated: 0, isDeleted: true };
        
        // [ ] を削ってカンマで分割
        const parts = tStr.slice(1, -1).split(',');
        return {
          id,
          name: postProcess(parts[0]),
          status: Number(parts[1]) as 0 | 1 | 2,
          deadlineOffset: Number(parts[2]) === 0 ? undefined : Number(parts[2]),
          lastUpdated: Number(parts[3]),
          parentId: parts[4] === "0" ? undefined : parts[4]
        };
      }),
      lastSynced: lastSynced
    };
  } catch (e) {
    console.error("Decompress failed", e);
    return null;
  }
};