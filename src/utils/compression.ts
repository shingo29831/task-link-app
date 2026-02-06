// src/utils/compression.ts
import LZString from 'lz-string';
import type { AppData } from '../types';
import { USER_DICTIONARY, DICT_SYMBOLS } from './dictionary';

const EPOCH_2020_MIN = 26297280;
const DEFAULT_PROJECT_NAME = 'マイプロジェクト';

// 1バイト領域 (0x0080 - 0x00FF) の開始位置
const MAPPING_START = 0x0080;

// 【選抜】頻出ひらがな (64文字)
// 基準: 清音(45) + 頻出濁音(18) + 小文字(1) = 64
// ※「を」は含める、「ゐゑ」は除外
const FREQ_HIRAGANA = 
  "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほ" +
  "まみむめもやゆよらりるれろわをん" +
  "がぎぐげござじずぜぞだでどばびぶべぼ" + // 頻出濁音
  "っ"; // よく使う小文字

// 【選抜】頻出カタカナ (64文字)
// 基準: 長音(1) + 清音(45) + 頻出濁音/半濁音(14) + 小文字(4) = 64
// ※ IT用語(タスク, プロジェクト, ユーザー, レビュー, デバッグ)を優先
const FREQ_KATAKANA = 
  "ー" + // 長音（最重要）
  "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ" +
  "マミムメモヤユヨラリルレロワヲン" +
  "ガギグゲゴジズダデドバビブベボプ" + // 頻出濁音・半濁音 (プ, ブ, ビ, デ, ガ, ジ 等)
  "ッィェュ"; // 小文字 (ッ, ユーザー, フェーズ, レビュー)

// マッピング用文字列 (合計128文字)
const MAPPED_CHARS = FREQ_HIRAGANA + FREQ_KATAKANA;

// 高速検索用マップ
const CHAR_TO_CODE = new Map<string, string>();
for (let i = 0; i < MAPPED_CHARS.length; i++) {
  const char = MAPPED_CHARS[i];
  const code = String.fromCharCode(MAPPING_START + i);
  CHAR_TO_CODE.set(char, code);
}

// 置換対象文字の正規表現 (エスケープが必要な文字が含まれない前提)
const REPLACE_REGEX = new RegExp(`[${MAPPED_CHARS}]`, 'g');

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

  // 1. 辞書機能向けのエスケープ
  res = res.replace(/\\/g, '\\\\');
  const symbolsPattern = Array.from(DICT_SYMBOLS).map(escapeRegExp).join('|');
  if (symbolsPattern) {
    res = res.replace(new RegExp(`(${symbolsPattern})`, 'g'), '\\$1');
  }

  // 2. 辞書による置換 ( 単語 -> 記号 )
  Object.entries(USER_DICTIONARY).forEach(([k, v]) => {
    res = res.split(k).join(v);
  });

  // 3. 構造を壊す文字をエスケープ
  res = res.replace(/\[/g, ESCAPE_MAP['['])
           .replace(/\]/g, ESCAPE_MAP[']'])
           .replace(/,/g,  ESCAPE_MAP[',']);

  // 4. 頻出文字のシフト (ひらがな・カタカナ混合)
  // マップに登録された128文字を一括で1バイト領域に置換
  res = res.replace(REPLACE_REGEX, (c) => CHAR_TO_CODE.get(c) || c);

  return res;
};

const postProcess = (str: string): string => {
  // 1. 頻出文字のアンシフト
  // 0x0080(128) 〜 0x00FF(255) の範囲を元の文字に戻す
  let res = str.replace(/[\u0080-\u00FF]/g, (c) => {
    const index = c.charCodeAt(0) - MAPPING_START;
    return MAPPED_CHARS[index] || c;
  });

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

  if (data.projectStartDate) {
    const start = Math.floor(data.projectStartDate / 60000 - EPOCH_2020_MIN).toString(36);
    headerParts.push(start);
  }

  const header = headerParts.join(',');
  
  // Tasks
  const tasksStr = data.tasks.map(t => {
    if (t.isDeleted) return "["; 
    
    const vName = preProcess(t.name);
    const vOrder = (t.order !== undefined && t.order !== null) ? t.order.toString(36) : "";
    const vUpdated = Math.floor(t.lastUpdated / 60000 - EPOCH_2020_MIN).toString(36);
    const vParent = (t.parentId === "0" || !t.parentId) ? "" : t.parentId;
    const vStatus = t.status === 0 ? "" : t.status.toString();
    const vDeadline = (t.deadlineOffset === 0 || t.deadlineOffset === undefined) ? "" : t.deadlineOffset.toString();

    const parts = [vName, vOrder, vUpdated, vParent, vStatus, vDeadline];

    while (parts.length > 0 && parts[parts.length - 1] === "") {
      parts.pop();
    }
    return "[" + parts.join(",");
  }).join('');

  return header + tasksStr;
};

export const compressData = (data: AppData): string => {
  return LZString.compressToEncodedURIComponent(getIntermediateJson(data));
};

export const decompressData = (compressed: string): AppData | null => {
  try {
    const raw = LZString.decompressFromEncodedURIComponent(compressed);
    if (!raw) return null;

    const firstBracketIdx = raw.indexOf('[');
    let headerStr = "";
    let tasksBody = "";

    if (firstBracketIdx === -1) {
      headerStr = raw;
      tasksBody = "";
    } else {
      headerStr = raw.substring(0, firstBracketIdx);
      tasksBody = raw.substring(firstBracketIdx);
    }

    const headerParts = headerStr.split(',');
    const projectName = postProcess(headerParts[0]) || DEFAULT_PROJECT_NAME;
    
    const lastSyncedVal = headerParts[1] ? parseInt(headerParts[1], 36) : 0;
    const lastSynced = (lastSyncedVal +EPOCH_2020_MIN) * 60000;

    let projectStartDate = (0 + EPOCH_2020_MIN) * 60000;
    if (headerParts.length > 2 && headerParts[2] !== "") {
      const startVal = parseInt(headerParts[2], 36);
      projectStartDate = (startVal + EPOCH_2020_MIN) * 60000;
    }

    const taskStrings = tasksBody.split('[');
    if (taskStrings.length > 0 && taskStrings[0] === "") {
      taskStrings.shift();
    }

    const tasks = taskStrings.map((tStr, index) => {
      const id = (index + 1).toString(36);
      if (tStr === "") return { id, name: "", status: 0 as const, lastUpdated: 0, isDeleted: true };
      
      const parts = tStr.split(',');
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

      return { id, name, status, deadlineOffset, lastUpdated, parentId, order };
    });

    return { projectName, projectStartDate, tasks, lastSynced };

  } catch (e) {
    console.error("Decompression failed", e);
    return null;
  }
};