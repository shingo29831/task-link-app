// src/utils/compression.ts
import LZString from 'lz-string';
import type { AppData } from '../types';
import { USER_DICTIONARY, DICT_SYMBOLS } from './dictionary';

const EPOCH_2020_MIN = 26297280;

const HIRAGANA_START = 0x3041;
const MAPPING_START = 0x0080;

// デフォルトのプロジェクト名
const DEFAULT_PROJECT_NAME = 'マイプロジェクト';

/**
 * 正規表現のエスケープ
 */
const escapeRegExp = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const preProcess = (str: string): string => {
  // 1. 全角英数を半角に変換
  let res = str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));

  // 2. エスケープ処理: 
  //    バックスラッシュ自体をエスケープ ( \ -> \\ )
  res = res.replace(/\\/g, '\\\\');

  // 3. 辞書で使用する記号が本文に含まれている場合のエスケープ ( 記号 -> \記号 )
  //    例: 本文に「①」があった場合、辞書の置換と区別するために「\①」にする
  const symbolsPattern = Array.from(DICT_SYMBOLS).map(escapeRegExp).join('|');
  if (symbolsPattern) {
    res = res.replace(new RegExp(`(${symbolsPattern})`, 'g'), '\\$1');
  }

  // 4. 辞書による置換 ( 単語 -> 記号 )
  //    長い単語から順に置換することで、部分一致による誤変換を防ぐ（キーの長さ順でソート推奨だが、今回は定義順）
  Object.entries(USER_DICTIONARY).forEach(([k, v]) => {
    res = res.split(k).join(v);
  });

  // 5. システムで使用する区切り文字の退避
  res = res.replace(/\[/g, '［').replace(/\]/g, '］').replace(/,/g, '，');

  // 6. ひらがなのシフト（難読化/圧縮効率向上）
  return res.replace(/[ぁ-ん]/g, (c) => String.fromCharCode(c.charCodeAt(0) - HIRAGANA_START + MAPPING_START));
};

const postProcess = (str: string): string => {
  // 1. ひらがなのアンシフト
  let res = str.replace(/[\u0080-\u00FF]/g, (c) => String.fromCharCode(c.charCodeAt(0) - MAPPING_START + HIRAGANA_START));

  // 2. システム区切り文字の復元
  res = res.replace(/［/g, '[').replace(/］/g, ']').replace(/，/g, ',');

  // 3. 辞書の復元とアンエスケープ
  //    パターン: \\(エスケープされた文字) OR (辞書の記号)
  //    辞書の記号から逆引きマップを作成
  const reverseDict: Record<string, string> = {};
  Object.entries(USER_DICTIONARY).forEach(([k, v]) => reverseDict[v] = k);

  const symbolsPattern = Array.from(DICT_SYMBOLS).map(escapeRegExp).join('|');
  // 正規表現: \\(任意の文字) | (辞書の記号)
  const decodeRegex = new RegExp(`\\\\([\\s\\S])|(${symbolsPattern})`, 'g');

  res = res.replace(decodeRegex, (match, escapedChar, symbolChar) => {
    if (escapedChar) {
      // エスケープされた文字があった場合（例: \\ -> \, \① -> ①）
      // そのまま文字を返す（エスケープ解除）
      return escapedChar;
    }
    if (symbolChar) {
      // エスケープされていない辞書記号の場合、単語に戻す
      return reverseDict[symbolChar] || symbolChar;
    }
    return match;
  });

  return res;
};

export const getIntermediateJson = (data: AppData): string => {
  const start = Math.floor(data.projectStartDate / 60000 - EPOCH_2020_MIN).toString(36);
  const end = Math.floor(data.lastSynced / 60000 - EPOCH_2020_MIN).toString(36);
  
  const tasksStr = data.tasks.map(t => {
    if (t.isDeleted) return "[";
    const status = t.status === 0 ? "" : t.status;
    const deadline = (t.deadlineOffset === 0 || t.deadlineOffset === undefined) ? "" : t.deadlineOffset;
    const updated = Math.floor(t.lastUpdated / 60000 - EPOCH_2020_MIN).toString(36);
    const parent = (t.parentId === "0" || !t.parentId) ? "" : t.parentId;
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
        return {
          id,
          name: postProcess(parts[0]),
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