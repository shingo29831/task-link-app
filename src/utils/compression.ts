// src/utils/compression.ts
import LZString from 'lz-string';
import type { AppData } from '../types';
import { USER_DICTIONARY, DICT_SYMBOLS } from './dictionary';

const EPOCH_2020_MIN = 26297280;
const HIRAGANA_START = 0x3041;
const MAPPING_START = 0x0080;
const DEFAULT_PROJECT_NAME = 'マイプロジェクト';

// ★追加: 区切り文字の一時退避用コード（制御文字などの普段入力しない文字を使用）
const ESCAPE_MAP = {
  '[': '\x10', // Data Link Escape
  ']': '\x11', // Device Control 1
  ',': '\x12', // Device Control 2
} as const;

/**
 * 正規表現のエスケープ
 */
const escapeRegExp = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const preProcess = (str: string): string => {
  // 1. 全角英数を半角に変換
  let res = str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));

  // 2. 辞書機能向けのエスケープ（ \ -> \\, 辞書記号 -> \辞書記号 ）
  res = res.replace(/\\/g, '\\\\');
  const symbolsPattern = Array.from(DICT_SYMBOLS).map(escapeRegExp).join('|');
  if (symbolsPattern) {
    res = res.replace(new RegExp(`(${symbolsPattern})`, 'g'), '\\$1');
  }

  // 3. 辞書による置換 ( 単語 -> 記号 )
  Object.entries(USER_DICTIONARY).forEach(([k, v]) => {
    res = res.split(k).join(v);
  });

  // ★変更: 区切り文字を全角ではなく、特殊な制御文字に置換して退避
  // これにより、データの区切り（,や[]）と、文字としての（,や[]）が衝突しなくなります
  res = res.replace(/\[/g, ESCAPE_MAP['['])
           .replace(/\]/g, ESCAPE_MAP[']'])
           .replace(/,/g,  ESCAPE_MAP[',']);

  // 5. ひらがなのシフト
  return res.replace(/[ぁ-ん]/g, (c) => String.fromCharCode(c.charCodeAt(0) - HIRAGANA_START + MAPPING_START));
};

const postProcess = (str: string): string => {
  // 1. ひらがなのアンシフト
  let res = str.replace(/[\u0080-\u00FF]/g, (c) => String.fromCharCode(c.charCodeAt(0) - MAPPING_START + HIRAGANA_START));

  // ★変更: 特殊文字を元の半角区切り文字に戻す
  res = res.replace(new RegExp(ESCAPE_MAP['['], 'g'), '[')
           .replace(new RegExp(ESCAPE_MAP[']'], 'g'), ']')
           .replace(new RegExp(ESCAPE_MAP[','], 'g'), ',');

  // 3. 辞書の復元とアンエスケープ
  const reverseDict:Record<string, string> = {};
  Object.entries(USER_DICTIONARY).forEach(([k, v]) => reverseDict[v] = k);

  const symbolsPattern = Array.from(DICT_SYMBOLS).map(escapeRegExp).join('|');
  const decodeRegex = new RegExp(`\\\\([\\s\\S])|(${symbolsPattern})`, 'g');

  res = res.replace(decodeRegex, (match, escapedChar, symbolChar) => {
    if (escapedChar) return escapedChar; // エスケープ解除（\記号 -> 記号）
    if (symbolChar) return reverseDict[symbolChar] || symbolChar; // 辞書復元
    return match;
  });

  return res;
};

// ... 以下 getIntermediateJson, compressData, decompressData は変更なし ...
// ※ getIntermediateJson 内で使用されるカンマやブラケットは「区切り」として機能し、
//    preProcess で変換された制御文字は「値」として機能するため、正常にパースされます。

export const getIntermediateJson = (data: AppData): string => {
  // 既存の実装のまま使用
  const start = Math.floor(data.projectStartDate / 60000 - EPOCH_2020_MIN).toString(36);
  const end = Math.floor(data.lastSynced / 60000 - EPOCH_2020_MIN).toString(36);
  
  const tasksStr = data.tasks.map(t => {
    if (t.isDeleted) return "[";
    const status = t.status === 0 ? "" : t.status;
    const deadline = (t.deadlineOffset === 0 || t.deadlineOffset === undefined) ? "" : t.deadlineOffset;
    const updated = Math.floor(t.lastUpdated / 60000 - EPOCH_2020_MIN).toString(36);
    const parent = (t.parentId === "0" || !t.parentId) ? "" : t.parentId;
    // ここで preProcess(t.name) が呼ばれ、名前の中のカンマ等は制御文字に変わっているため、
    // 外側の区切り文字と混ざることはありません。
    return `[${preProcess(t.name)},${status},${deadline},${updated},${parent}`;
  }).join('');

  return `${preProcess(data.projectName)},${start}${tasksStr}]${end}`;
};

export const compressData = (data: AppData): string => {
  return LZString.compressToEncodedURIComponent(getIntermediateJson(data));
};

export const decompressData = (compressed: string): AppData | null => {
  try {
    const raw = LZString.decompressFromEncodedURIComponent(compressed);
    if (!raw) return null;

    const nameEndIdx = raw.indexOf(',');
    if (nameEndIdx === -1) return null;
    
    // ここで postProcess が呼ばれ、制御文字が元の半角文字に戻ります
    const projectName = postProcess(raw.substring(0, nameEndIdx)) || DEFAULT_PROJECT_NAME;
    const body = raw.substring(nameEndIdx + 1);

    const firstIdx = body.indexOf('[');
    const lastIdx = body.lastIndexOf(']');

    if (firstIdx === -1) {
      const parts = body.split(']');
      return { 
        projectName,
        projectStartDate: (parseInt(parts[0], 36) + EPOCH_2020_MIN) * 60000, 
        tasks: [], 
        lastSynced: (parseInt(parts[1], 36) + EPOCH_2020_MIN) * 60000 
      };
    }

    const startDate = (parseInt(body.substring(0, firstIdx), 36) + EPOCH_2020_MIN) * 60000;
    const lastSynced = (parseInt(body.substring(lastIdx + 1), 36) + EPOCH_2020_MIN) * 60000;
    const tasksBody = body.substring(firstIdx, lastIdx);
    const taskStrings = tasksBody.split('[').slice(1);

    return {
      projectName,
      projectStartDate: startDate,
      tasks: taskStrings.map((tStr, index) => {
        const id = (index + 1).toString(36);
        if (tStr === "") return { id, name: "", status: 0, lastUpdated: 0, isDeleted: true };
        const parts = tStr.split(','); // 制御文字はここでは分割されません
        return {
          id,
          name: postProcess(parts[0]), // ここで元の名前に復元
          status: (parts[1] === "" ? 0 : Number(parts[1])) as 0|1|2|3,
          deadlineOffset: parts[2] === "" ? undefined : Number(parts[2]),
          lastUpdated: (parseInt(parts[3], 36) + EPOCH_2020_MIN) * 60000,
          parentId: parts[4] === "" ? undefined : parts[4]
        };
      }),
      lastSynced: lastSynced
    };
  } catch { return null; }
};