import LZString from 'lz-string';
import type { AppData } from '../types';
import { USER_DICTIONARY, DICT_SYMBOLS } from './dictionary';
import { MAPPING_GROUPS_V0 as MAPPING_GROUPS } from './versions/v0';
import { differenceInCalendarDays } from 'date-fns';

// 簡易ID生成関数
const generateProjectId = () => Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

// ==========================================
// Constants & Configuration
// ==========================================

const CURRENT_VERSION = 0;
const DEFAULT_PROJECT_NAME = 'マイプロジェクト';

// 変更: 基準日を2026年1月1日に更新
// 2026-01-01 00:00:00 UTC = 1767225600 sec = 29453760 min
const EPOCH_2026_MIN = 29453760; 
const EPOCH_2026_DATE = new Date(2026, 0, 1).getTime(); 

const BASE185_CHARS = (() => {
  let chars = '';
  for (let i = 33; i <= 126; i++) {
    if ([44, 45, 91, 92, 93].includes(i)) continue;
    chars += String.fromCharCode(i);
  }
  for (let i = 161; i <= 255; i++) {
    chars += String.fromCharCode(i);
  }
  return chars;
})();
const BASE_LEN = BASE185_CHARS.length;

const SWAP_MAP_CACHE = new Map<number, Map<string, string>>();

const ESCAPE_MAP = {
  '[': '\x10',
  ']': '\x11',
  ',': '\x12',
} as const;

// ==========================================
// Base185 Encoding / Decoding
// ==========================================

export const to185 = (num: number | undefined): string => {
  if (num === undefined || num === null || isNaN(num)) return '';
  if (num === 0) return BASE185_CHARS[0];
  let n = Math.abs(num);
  let res = '';
  while (n > 0) {
    res = BASE185_CHARS[n % BASE_LEN] + res;
    n = Math.floor(n / BASE_LEN);
  }
  return num < 0 ? '-' + res : res;
};

export const from185 = (str: string): number => {
  if (!str) return 0;
  let s = str;
  let sign = 1;
  if (s.startsWith('-')) {
    sign = -1;
    s = s.substring(1);
  }
  let num = 0;
  for (let i = 0; i < s.length; i++) {
    const charIndex = BASE185_CHARS.indexOf(s[i]);
    if (charIndex === -1) return NaN;
    num = num * BASE_LEN + charIndex;
  }
  return num * sign;
};

// ==========================================
// String Processing
// ==========================================

const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const applyDictionaryAndEscape = (str: string): string => {
  let res = str;
  res = res.replace(/\\/g, '\\\\');
  
  const symbolsPattern = Array.from(DICT_SYMBOLS).map(escapeRegExp).join('|');
  if (symbolsPattern) {
    res = res.replace(new RegExp(`(${symbolsPattern})`, 'g'), '\\$1');
  }

  Object.entries(USER_DICTIONARY).forEach(([k, v]) => {
    res = res.split(k).join(v);
  });

  res = res.replace(/\[/g, ESCAPE_MAP['['])
           .replace(/\]/g, ESCAPE_MAP[']'])
           .replace(/,/g,  ESCAPE_MAP[',']);
  return res;
};

const restoreDictionaryAndEscape = (str: string): string => {
  let res = str;
  res = res.replace(new RegExp(ESCAPE_MAP['['], 'g'), '[')
           .replace(new RegExp(ESCAPE_MAP[']'], 'g'), ']')
           .replace(new RegExp(ESCAPE_MAP[','], 'g'), ',');

  const reverseDict: Record<string, string> = {};
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

// ==========================================
// Swapping Logic
// ==========================================

const initSwapCache = (groupId: number) => {
  if (SWAP_MAP_CACHE.has(groupId)) return;
  const group = MAPPING_GROUPS[groupId];
  if (!group) return;
  const map = new Map<string, string>();
  const len = Math.min(group.primary.length, group.secondary.length);
  for (let i = 0; i < len; i++) {
    const p = group.primary[i];
    const s = group.secondary[i];
    map.set(p, s);
    map.set(s, p);
  }
  SWAP_MAP_CACHE.set(groupId, map);
};

const swapChars = (str: string, groupId: number): string => {
  if (!MAPPING_GROUPS[groupId]) return str;
  initSwapCache(groupId);
  const map = SWAP_MAP_CACHE.get(groupId);
  if (!map) return str;
  const group = MAPPING_GROUPS[groupId];
  const allChars = group.primary.substring(0, map.size / 2) + group.secondary.substring(0, map.size / 2);
  const pattern = new RegExp(`[${escapeRegExp(allChars)}]`, 'g');
  return str.replace(pattern, (c) => map.get(c) || c);
};

const analyzeBestGroup = (sampleText: string): number => {
  const scores = MAPPING_GROUPS.map((group, index) => {
    const pSet = new Set(group.primary);
    const sSet = new Set(group.secondary);
    let score = 0;
    for (const char of sampleText) {
      if (pSet.has(char)) {
        score += 1;
      } else if (sSet.has(char)) {
        score -= 1;
      }
    }
    return { index, score };
  });
  scores.sort((a, b) => b.score - a.score);
  return scores[0].index;
};

// ==========================================
// Optimal Reference Date Calculation
// ==========================================

// 最もバイト数を節約できる基準日（2026-01-01からの日数）を計算
const calculateOptimalRefDate = (deadlines: number[]): number => {
  if (deadlines.length === 0) return 0; // デフォルト

  // 2026-01-01からの日数リストに変換
  const daysList = deadlines.map(d => differenceInCalendarDays(d, EPOCH_2026_DATE));
  
  // 候補：タスクが存在する日を基準日の候補とする
  const candidates = Array.from(new Set(daysList));
  candidates.sort((a, b) => a - b);

  let bestRef = candidates[0];
  let minScore = Infinity;

  for (const ref of candidates) {
    let score = 0;
    for (const d of daysList) {
      const diff = d - ref;
      // ヒューリスティック: 
      // 0 <= diff < 185 (正の1バイト圏内): 1点
      // -185 < diff < 0 (負の2バイト圏内): 2点
      // それ以外: 実際の文字数
      
      if (diff >= 0 && diff < 185) {
        score += 1;
      } else if (diff > -185 && diff < 0) {
        score += 2;
      } else {
        score += to185(diff).length;
      }

      // 累積スコアがすでに最小スコア以上になったら、これ以上計算しても無駄なので打ち切る
      if (score >= minScore) {
        break; // ループを脱出
      }
    }
    
    if (score < minScore) {
      minScore = score;
      bestRef = ref;
    }
  }

  return bestRef;
};

// ==========================================
// Main Flow
// ==========================================

export const getIntermediateJson = (data: AppData): string => {
  const rawProjectName = applyDictionaryAndEscape(data.projectName);
  
  const activeTasks = data.tasks.filter(t => !t.isDeleted);

  const activeTaskNames = activeTasks
    .map(t => applyDictionaryAndEscape(t.name))
    .join('');
  
  const sampleText = rawProjectName + activeTaskNames;
  const groupId = analyzeBestGroup(sampleText);

  const pName = swapChars(rawProjectName, groupId);
  
  // 基準日計算
  const deadlines = activeTasks
    .map(t => t.deadline)
    .filter((d): d is number => d !== undefined);
  
  // 2026-01-01からの日数オフセット
  const refDateDays = calculateOptimalRefDate(deadlines);

  const header = [
    to185(CURRENT_VERSION),
    to185(groupId),
    pName,
    to185(Math.floor(data.lastSynced / 60000 - EPOCH_2026_MIN)),
    to185(refDateDays) // Project Reference Date (Days from 2026)
  ].join(',');

  const tasksStr = activeTasks
    .map((t) => {
      const vId = to185(parseInt(t.id, 36));
      const rawName = applyDictionaryAndEscape(t.name);
      const vName = swapChars(rawName, groupId);
      const vOrder = to185(t.order ?? 0);
      const vUpdated = to185(Math.floor(t.lastUpdated / 60000 - EPOCH_2026_MIN));
      
      let vParent = "";
      if (t.parentId && t.parentId !== "0") {
        const pidNum = parseInt(t.parentId, 36);
        if (!isNaN(pidNum)) {
          vParent = to185(pidNum);
        } else {
          vParent = t.parentId;
        }
      }

      const vStatus = t.status === 0 ? "" : t.status.toString();
      
      // 期限: 基準日からの差分を保存
      let vDeadline = "";
      if (t.deadline !== undefined) {
        const dDays = differenceInCalendarDays(t.deadline, EPOCH_2026_DATE);
        const diff = dDays - refDateDays;
        vDeadline = to185(diff);
      }

      // [ID, Name, Order, Updated, Parent, Status, Deadline(diff)]
      const parts = [vId, vName, vOrder, vUpdated, vParent, vStatus, vDeadline];
      while (parts.length > 0 && parts[parts.length - 1] === "") parts.pop();
      
      return "[" + parts.join(",");
    }).join('');

  return header + tasksStr;
};

export const compressData = (data: AppData): string => {
  return LZString.compressToEncodedURIComponent(getIntermediateJson(data));
};

export const decompressData = (compressed: string): AppData | null => {
  try {
    const QX = LZString.decompressFromEncodedURIComponent(compressed);
    if (!QX) return null;
    const raw = QX;

    const firstBracketIdx = raw.indexOf('[');
    let headerStr = (firstBracketIdx === -1) ? raw : raw.substring(0, firstBracketIdx);
    let tasksBody = (firstBracketIdx === -1) ? "" : raw.substring(firstBracketIdx);

    const headerParts = headerStr.split(',');
    
    const versionCandidate = from185(headerParts[0]);
    const isVer1 = versionCandidate === 1;
    const isVer0 = versionCandidate === 0 && !isNaN(versionCandidate);

    let projectName = DEFAULT_PROJECT_NAME;
    let lastSynced = 0;
    let groupId = 0;
    let refDateDays = 0; // Default Reference Date Offset

    if (isVer1 || isVer0) {
      groupId = from185(headerParts[1]);
      projectName = restoreDictionaryAndEscape(swapChars(headerParts[2], groupId));
      
      lastSynced = (from185(headerParts[3]) + EPOCH_2026_MIN) * 60000;
      if (headerParts[4]) {
        refDateDays = from185(headerParts[4]);
      }
    } else {
      // Legacy Format (fallback)
      projectName = headerParts[0]; 
      if (headerParts[1]) {
        const val = parseInt(headerParts[1], 36);
        // 旧Epochとの互換性は失われますが、ここでは新しいEpochで処理するか、
        // あるいは旧データも2026ベースに変換されたとみなす等の対応になります。
        // （完全な下位互換が必要な場合は、バージョン番号で分岐して EPOCH_2020_MIN を使う等の処理が必要です）
        if (!isNaN(val)) lastSynced = (val + EPOCH_2026_MIN) * 60000;
      }
    }

    const taskStrings = tasksBody.split('[');
    if (taskStrings.length > 0 && taskStrings[0] === "") taskStrings.shift();

    const tasks = taskStrings.map((tStr: string, index: number) => {
      if (isVer1 || isVer0) {
        const parts = tStr.split(',');
        const id = from185(parts[0]).toString(36);
        const name = restoreDictionaryAndEscape(swapChars(parts[1], groupId));
        const order = from185(parts[2]);
        const lastUpdated = (from185(parts[3]) + EPOCH_2026_MIN) * 60000;
        
        let parentId: string | undefined = undefined;
        if (parts[4]) {
           const pidNum = from185(parts[4]);
           parentId = pidNum.toString(36);
        }

        const status = (parts[5] ? Number(parts[5]) : 0) as 0|1|2|3;
        
        let deadline: number | undefined = undefined;
        if (parts[6]) {
            const diff = from185(parts[6]);
            const totalDays = refDateDays + diff;
            // 2026-01-01 + totalDays から絶対時間を復元
            const d = new Date(EPOCH_2026_DATE);
            d.setDate(d.getDate() + totalDays);
            deadline = d.getTime();
        }

        return { id, name, status, deadline, lastUpdated, parentId, order };
      }

      // Legacy Logic (offset based)
      const id = (index + 1).toString(36);
      if (tStr === "") return { id, name: "", status: 0 as const, lastUpdated: 0, isDeleted: true };
      
      const parts = tStr.split(',');
      const name = parts[0]; 
      const order = parts[1] ? parseInt(parts[1], 36) : 0;
      const updatedVal = parts[2] ? parseInt(parts[2], 36) : 0;
      const lastUpdated = (updatedVal + EPOCH_2026_MIN) * 60000;
      const parentId = parts[3] || undefined;
      const status = (parts[4] ? Number(parts[4]) : 0) as 0|1|2|3;
      
      const deadline = undefined; 

      return { id, name, status, deadline, lastUpdated, parentId, order };
    });

    return { 
        id: generateProjectId(),
        projectName, 
        tasks, 
        lastSynced 
    };

  } catch (e) {
    console.error("Decompression failed", e);
    return null;
  }
};