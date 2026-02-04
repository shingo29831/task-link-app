import LZString from 'lz-string';
import { AppData } from '../types';

// ユーザー辞書（頻出ワード）
const USER_DICTIONARY: Record<string, string> = {
  "確認": "①", "完了": "②", "修正": "③", "【重要】": "④"
};
// ひらがなマッピング定数
const HIRAGANA_START = 0x3041;
const MAPPING_START = 0x0080;

// URL生成用：データを圧縮文字列へ
export const compressData = (data: AppData): string => {
  // ここでキーの1文字化や辞書置換などの「前処理」を行う
  // ※簡略化のため、まずはJSONをそのままlz-stringに通す例です
  // 本格実装時はここに前回の「preProcess」ロジックを入れます
  const json = JSON.stringify(data);
  return LZString.compressToEncodedURIComponent(json);
};

// 復元用：圧縮文字列をデータへ
export const decompressData = (compressed: string): AppData | null => {
  try {
    const json = LZString.decompressFromEncodedURIComponent(compressed);
    return json ? JSON.parse(json) : null;
  } catch (e) {
    console.error("Decompression failed", e);
    return null;
  }
};