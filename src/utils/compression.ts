// src/utils/compression.ts
import LZString from 'lz-string';
import type { AppData } from '../types';
import { USER_DICTIONARY, DICT_SYMBOLS } from './dictionary';

const EPOCH_2020_MIN = 26297280;
const HIRAGANA_START = 0x3041;
const MAPPING_START = 0x0080;
const DEFAULT_PROJECT_NAME = 'マイプロジェクト';

// 区切り文字の一時退避用コード（制御文字）
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
  let res = str;

  // 1. 辞書機能向けのエスケープ（ \ -> \\, 辞書記号 -> \辞書記号 ）
  res = res.replace(/\\/g, '\\\\');
  const symbolsPattern = Array.from(DICT_SYMBOLS).map(escapeRegExp).join('|');
  if (symbolsPattern) {
    res = res.replace(new RegExp(`(${symbolsPattern})`, 'g'), '\\$1');
  }

  // 2. 辞書による置換 ( 単語 -> 記号 )
  Object.entries(USER_DICTIONARY).forEach(([k, v]) => {
    res = res.split(k).join(v);
  });

  // 3. 構造を壊す文字（半角の [ ] , ）のみを制御文字にエスケープ
  // これにより、全角の［ ］ ， や ー はそのまま維持されます
  res = res.replace(/\[/g, ESCAPE_MAP['['])
           .replace(/\]/g, ESCAPE_MAP[']'])
           .replace(/,/g,  ESCAPE_MAP[',']);

  // 4. ひらがなのシフト
  return res.replace(/[ぁ-ん]/g, (c) => String.fromCharCode(c.charCodeAt(0) - HIRAGANA_START + MAPPING_START));
};

const postProcess = (str: string): string => {
  // 1. ひらがなのアンシフト
  let res = str.replace(/[\u0080-\u00FF]/g, (c) => String.fromCharCode(c.charCodeAt(0) - MAPPING_START + HIRAGANA_START));

  // 2. 特殊文字を元の半角区切り文字に戻す
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

export const getIntermediateJson = (data: AppData): string => {
  const start = Math.floor(data.projectStartDate / 60000 - EPOCH_2020_MIN).toString(36);
  const end = Math.floor(data.lastSynced / 60000 - EPOCH_2020_MIN).toString(36);
  
  const tasksStr = data.tasks.map(t => {
    if (t.isDeleted) return "[";
    
    // 値の定義: [タスク名, 並び順, updated, parent, status, deadline]
    const vName = preProcess(t.name);
    const vOrder = (t.order && t.order !== 0) ? t.order.toString(36) : ""; // 0または未定義は空文字
    const vUpdated = Math.floor(t.lastUpdated / 60000 - EPOCH_2020_MIN).toString(36);
    const vParent = (t.parentId === "0" || !t.parentId) ? "" : t.parentId;
    const vStatus = t.status === 0 ? "" : t.status.toString();
    const vDeadline = (t.deadlineOffset === 0 || t.deadlineOffset === undefined) ? "" : t.deadlineOffset.toString();

    const parts = [vName, vOrder, vUpdated, vParent, vStatus, vDeadline];

    // 右端から空文字を削除（カンマごと消す）
    while (parts.length > 0 && parts[parts.length - 1] === "") {
      parts.pop();
    }

    return "[" + parts.join(",");
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
    
    // プロジェクト名の復元
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
        
        const parts = tStr.split(',');
        
        // 構造: [name, order, updated, parent, status, deadline]
        const name = postProcess(parts[0]);
        const orderVal = parts[1] ? parseInt(parts[1], 36) : 0;
        const order = isNaN(orderVal) ? 0 : orderVal;
        
        const updatedVal = parts[2] ? parseInt(parts[2], 36) : 0;
        const lastUpdated = (updatedVal + EPOCH_2020_MIN) * 60000;
        
        const parentId = (parts[3] && parts[3] !== "") ? parts[3] : undefined;
        
        const statusVal = parts[4] ? Number(parts[4]) : 0;
        const status = (isNaN(statusVal) ? 0 : statusVal) as 0|1|2|3;
        
        const deadlineVal = parts[5] ? Number(parts[5]) : undefined;
        const deadlineOffset = (deadlineVal !== undefined && !isNaN(deadlineVal)) ? deadlineVal : undefined;

        return {
          id,
          name,
          status,
          deadlineOffset,
          lastUpdated,
          parentId,
          order
        };
      }),
      lastSynced: lastSynced
    };
  } catch { return null; }
};