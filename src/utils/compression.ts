import LZString from 'lz-string';
import type { AppData } from '../types';
import { USER_DICTIONARY, DICT_SYMBOLS } from './dictionary';
import { MAPPING_GROUPS_V0 as MAPPING_GROUPS } from './versions/v0';

// 簡易ID生成関数
const generateProjectId = () => Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

// ==========================================
// Constants & Configuration
// ==========================================

const CURRENT_VERSION = 0;
const DEFAULT_PROJECT_NAME = 'マイプロジェクト';
const EPOCH_2020_MIN = 26297280;

// Base185 Character Set (For Numbers)
// ASCII (33-126) excluding: , - [ ] \
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

// Cache
const SWAP_MAP_CACHE = new Map<number, Map<string, string>>();

// Control Character Escapes
const ESCAPE_MAP = {
  '[': '\x10',
  ']': '\x11',
  ',': '\x12',
} as const;

// ==========================================
// Base185 Encoding / Decoding (Numbers)
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
    if (charIndex === -1) return 0;
    num = num * BASE_LEN + charIndex;
  }
  return num * sign;
};

// ==========================================
// String Processing
// ==========================================

const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Pre-process: Dictionary & Structure Escape
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

// Post-process
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

// ==========================================
// Group Analysis
// ==========================================

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
// Main Flow
// ==========================================

export const getIntermediateJson = (data: AppData): string => {
  const rawProjectName = applyDictionaryAndEscape(data.projectName);
  
  const activeTaskNames = data.tasks
    .filter(t => !t.isDeleted)
    .map(t => applyDictionaryAndEscape(t.name))
    .join('');
  
  const sampleText = rawProjectName + activeTaskNames;
  const groupId = analyzeBestGroup(sampleText);

  const pName = swapChars(rawProjectName, groupId);
  
  const header = [
    to185(CURRENT_VERSION),
    to185(groupId),
    pName,
    to185(Math.floor(data.lastSynced / 60000 - EPOCH_2020_MIN)),
    data.projectStartDate ? to185(Math.floor(data.projectStartDate / 60000 - EPOCH_2020_MIN)) : ''
  ].join(',');

  const tasksStr = data.tasks
    .filter(t => !t.isDeleted) // Ver.1: 削除済みタスクは保存しない
    .map((t) => {
      // Ver.1: IDを含める (36進数文字列 -> 数値 -> 185進数)
      const vId = to185(parseInt(t.id, 36));
      
      const rawName = applyDictionaryAndEscape(t.name);
      const vName = swapChars(rawName, groupId);
      
      const vOrder = to185(t.order ?? 0);
      const vUpdated = to185(Math.floor(t.lastUpdated / 60000 - EPOCH_2020_MIN));
      
      // Ver.1: ParentIDも圧縮 (36進数文字列 -> 数値 -> 185進数)
      let vParent = "";
      if (t.parentId && t.parentId !== "0") {
        const pidNum = parseInt(t.parentId, 36);
        if (!isNaN(pidNum)) {
          vParent = to185(pidNum);
        } else {
          vParent = t.parentId; // fallback
        }
      }

      const vStatus = t.status === 0 ? "" : t.status.toString();
      const vDeadline = (t.deadlineOffset === undefined) ? "" : to185(t.deadlineOffset);

      // Ver.1: [ID, Name, Order, Updated, Parent, Status, Deadline]
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
    const isVer0 = versionCandidate === 0;

    let projectName = DEFAULT_PROJECT_NAME;
    let projectStartDate = (0 + EPOCH_2020_MIN) * 60000;
    let lastSynced = 0;
    let groupId = 0;

    if (isVer1 || isVer0) {
      groupId = from185(headerParts[1]);
      projectName = restoreDictionaryAndEscape(swapChars(headerParts[2], groupId));
      
      lastSynced = (from185(headerParts[3]) + EPOCH_2020_MIN) * 60000;
      if (headerParts[4]) {
        projectStartDate = (from185(headerParts[4]) + EPOCH_2020_MIN) * 60000;
      }
    } else {
      // Legacy Format
      projectName = headerParts[0]; 
      if (headerParts[1]) {
        const val = parseInt(headerParts[1], 36);
        if (!isNaN(val)) lastSynced = (val + EPOCH_2020_MIN) * 60000;
      }
    }

    const taskStrings = tasksBody.split('[');
    if (taskStrings.length > 0 && taskStrings[0] === "") taskStrings.shift();

    const tasks = taskStrings.map((tStr: string, index: number) => {
      // Ver.1 Logic
      if (isVer1) {
        const parts = tStr.split(',');
        // IDは先頭 (185進数 -> 数値 -> 36進数文字列)
        const id = from185(parts[0]).toString(36);
        
        const name = restoreDictionaryAndEscape(swapChars(parts[1], groupId));
        const order = from185(parts[2]);
        const lastUpdated = (from185(parts[3]) + EPOCH_2020_MIN) * 60000;
        
        // ParentID復元
        let parentId: string | undefined = undefined;
        if (parts[4]) {
           const pidNum = from185(parts[4]);
           parentId = pidNum.toString(36);
        }

        const status = (parts[5] ? Number(parts[5]) : 0) as 0|1|2|3;
        const deadlineOffset = parts[6] ? from185(parts[6]) : undefined;

        return { id, name, status, deadlineOffset, lastUpdated, parentId, order };
      }

      // Ver.0 & Legacy Logic
      const id = (index + 1).toString(36);
      if (tStr === "") return { id, name: "", status: 0 as const, lastUpdated: 0, isDeleted: true };
      
      const parts = tStr.split(',');
      
      let name = parts[0];
      let order = 0;
      let lastUpdated = 0;
      let parentId: string | undefined = undefined;
      let status: 0|1|2|3 = 0;
      let deadlineOffset: number | undefined = undefined;

      if (isVer0) {
         name = restoreDictionaryAndEscape(swapChars(parts[0], groupId));
         order = from185(parts[1]);
         lastUpdated = (from185(parts[2]) + EPOCH_2020_MIN) * 60000;
         parentId = parts[3] || undefined;
         status = (parts[4] ? Number(parts[4]) : 0) as 0|1|2|3;
         deadlineOffset = parts[5] ? from185(parts[5]) : undefined;
      } else {
         name = parts[0]; 
         order = parts[1] ? parseInt(parts[1], 36) : 0;
         const updatedVal = parts[2] ? parseInt(parts[2], 36) : 0;
         lastUpdated = (updatedVal + EPOCH_2020_MIN) * 60000;
         parentId = parts[3] || undefined;
         status = (parts[4] ? Number(parts[4]) : 0) as 0|1|2|3;
         if (parts[5]) deadlineOffset = Number(parts[5]);
      }

      return { id, name, status, deadlineOffset, lastUpdated, parentId, order };
    });

    return { 
        id: generateProjectId(),
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