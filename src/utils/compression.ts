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
    if (escapedChar) return escapedChar;
    if (symbolChar) return reverseDict[symbolChar] || symbolChar;
    return match;
  });

  return res;
};

export const getIntermediateJson = (data: AppData): string => {
  // Header: projectName, lastSynced [, projectStartDate]
  const pName = preProcess(data.projectName);
  const lastSynced = Math.floor(data.lastSynced / 60000 - EPOCH_2020_MIN).toString(36);
  
  const headerParts = [pName, lastSynced];

  // projectStartDateは設定されている場合のみ追加
  if (data.projectStartDate) {
    const start = Math.floor(data.projectStartDate / 60000 - EPOCH_2020_MIN).toString(36);
    headerParts.push(start);
  }

  const header = headerParts.join(',');
  
  // Tasks
  // Order: Name, Order, Updated, Parent, Status, Deadline
  const tasksStr = data.tasks.map(t => {
    if (t.isDeleted) return "["; // 削除済みタスクの扱い（最小限）
    
    const vName = preProcess(t.name);
    const vOrder = (t.order !== undefined && t.order !== null) ? t.order.toString(36) : "";
    const vUpdated = Math.floor(t.lastUpdated / 60000 - EPOCH_2020_MIN).toString(36);
    const vParent = (t.parentId === "0" || !t.parentId) ? "" : t.parentId;
    const vStatus = t.status === 0 ? "" : t.status.toString();
    const vDeadline = (t.deadlineOffset === 0 || t.deadlineOffset === undefined) ? "" : t.deadlineOffset.toString();

    const parts = [vName, vOrder, vUpdated, vParent, vStatus, vDeadline];

    // 右端から空文字を削除（カンマごと消す）
    while (parts.length > 0 && parts[parts.length - 1] === "") {
      parts.pop();
    }

    // 各タスクは "[" で開始する
    return "[" + parts.join(",");
  }).join('');

  // 最後の "]" は付けない
  return header + tasksStr;
};

export const compressData = (data: AppData): string => {
  return LZString.compressToEncodedURIComponent(getIntermediateJson(data));
};

export const decompressData = (compressed: string): AppData | null => {
  try {
    const raw = LZString.decompressFromEncodedURIComponent(compressed);
    if (!raw) return null;

    // tasksの開始地点は最初の "[" で判断
    const firstBracketIdx = raw.indexOf('[');
    
    let headerStr = "";
    let tasksBody = "";

    if (firstBracketIdx === -1) {
      // タスクがない場合
      headerStr = raw;
      tasksBody = "";
    } else {
      headerStr = raw.substring(0, firstBracketIdx);
      tasksBody = raw.substring(firstBracketIdx);
    }

    // Header解析
    const headerParts = headerStr.split(',');
    const projectName = postProcess(headerParts[0]) || DEFAULT_PROJECT_NAME;
    
    // lastSynced (index 1)
    const lastSyncedVal = headerParts[1] ? parseInt(headerParts[1], 36) : 0;
    const lastSynced = (lastSyncedVal +EPOCH_2020_MIN) * 60000;

    // projectStartDate (index 2, optional)
    let projectStartDate = (0 + EPOCH_2020_MIN) * 60000; // Default fallback
    if (headerParts.length > 2 && headerParts[2] !== "") {
      const startVal = parseInt(headerParts[2], 36);
      projectStartDate = (startVal + EPOCH_2020_MIN) * 60000;
    }

    // Tasks解析
    // tasksBodyは "[task1[task2..." の形式
    // 最初の "[" でsplitすると、最初の要素は空文字になる
    const taskStrings = tasksBody.split('[');
    // 先頭の空文字を除去
    if (taskStrings.length > 0 && taskStrings[0] === "") {
      taskStrings.shift();
    }

    const tasks = taskStrings.map((tStr, index) => {
      // IDはindex+1で生成 (旧ロジック踏襲)
      const id = (index + 1).toString(36);
      // 修正: status を 0 as const にして型推論エラーを回避
      if (tStr === "") return { id, name: "", status: 0 as const, lastUpdated: 0, isDeleted: true };
      
      const parts = tStr.split(',');

      // Order: Name, Order, Updated, Parent, Status, Deadline
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
    });

    return {
      projectName,
      projectStartDate,
      tasks,
      lastSynced
    };

  } catch (e) {
    console.error("Decompression failed", e);
    return null;
  }
};