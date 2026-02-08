// src/utils/versions/v0.ts
import { 
  ALL_HIRA, 
  ALL_KATA, 
  SWAP_COMBINED, 
  SWAP_LATIN1, 
  JP_BALANCE_128, 
  type MappingGroup 
} from '../mappingDefinitions';
import { validateMappingGroups } from '../mappingValidator';

// ==========================================
// Ver.0 固有の漢字定義
// ==========================================

export const FREQ_KANJI_41 = 
  "未中済完了待留急高低要締限始終確認決調考作送受見改写案件問備予自他主続休報連相会議"; //41

export const FREQ_KANJI_CULTURE_128 = 
  "日一十二本人大年三会中" + // 1-11
  "国長出五時行事生四間上" + // 12-22
  "分学的手後見下自地部者" + // 23-33
  "子東円同高社合前立内方" + // 34-44
  "代場理名家業発小新対月" + // 45-55
  "定気実力関体回政民動当" + // 56-66
  "法全明八野用市所通主相" + // 67-77
  "外文言機山不京作度校多" + // 78-88
  "道現公無海九問連員化物" + // 89-99
  "最表水意性教点正木利原" + // 100-110
  "書田近百先知平六話保万" + // 111-121
  "元工取今千金私";  // 122-128

export const FREQ_KANJI_CULTURE_132 = 
  "日一十二本人大年三会中" + // 1-11
  "国長出五時行事生四間上" + // 12-22
  "分学的手後見下自地部者" + // 23-33
  "子東円同高社合前立内方" + // 34-44
  "代場理名家業発小新対月" + // 45-55
  "定気実力関体回政民動当" + // 56-66
  "法全明八野用市所通主相" + // 67-77
  "外文言機山不京作度校多" + // 78-88
  "道現公無海九問連員化物" + // 89-99
  "最表水意性教点正木利原" + // 100-110
  "書田近百先知平六話保万" + // 111-121
  "元工取今千金私支和売七";  // 122-132

// 日本語スーパーセット (Ver.0用)
export const JP_SUPER_SET = ALL_HIRA + ALL_KATA + FREQ_KANJI_41;

// ==========================================
// Ver.0 マッピンググループ定義
// ==========================================

export const MAPPING_GROUPS_V0: MappingGroup[] = [
  // Group 0: SUPER SWAP (Max 218 chars)
  {
    name: "SUPER_JP_MIX",
    primary: JP_SUPER_SET,
    secondary: SWAP_COMBINED
  },
  // Group 1: LATIN1 BALANCE (128 chars)
  {
    name: "LATIN1_SAFE",
    primary: JP_BALANCE_128,
    secondary: SWAP_LATIN1
  },
  // Group 2: CULTURE_FREQ_JP (Max 218 chars)
  {
    name: "CULTURE_FREQ_JP",
    primary: ALL_HIRA + FREQ_KANJI_CULTURE_132,
    secondary: SWAP_COMBINED
  },

  {
    name: "CULTURE_FREQ_KANJI_JP",
    primary: FREQ_KANJI_CULTURE_128,
    secondary: SWAP_LATIN1
  }
];

// 定義の検証を実行
validateMappingGroups(MAPPING_GROUPS_V0);