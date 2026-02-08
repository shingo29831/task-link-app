// src/utils/mappingValidator.ts
import type { MappingGroup } from './mappingDefinitions';

const MAX_MAPPING_SIZE = 218;

export const validateMappingGroups = (groups: MappingGroup[]) => {
  groups.forEach(group => {
    // 1. 最大文字数制限のチェック
    if (group.primary.length > MAX_MAPPING_SIZE) {
      throw new Error(
        `[MappingDef Error] Group "${group.name}" primary set length (${group.primary.length}) exceeds maximum allowed size of ${MAX_MAPPING_SIZE}.`
      );
    }
    
    if (group.secondary.length > MAX_MAPPING_SIZE) {
      throw new Error(
        `[MappingDef Error] Group "${group.name}" secondary set length (${group.secondary.length}) exceeds maximum allowed size of ${MAX_MAPPING_SIZE}.`
      );
    }

    // 2. primary と secondary の文字数一致チェック
    if (group.primary.length !== group.secondary.length) {
      throw new Error(
        `[MappingDef Error] Group "${group.name}" has a length mismatch: primary(${group.primary.length}) and secondary(${group.secondary.length}) must be the same length.`
      );
    }

    // 3. (オプション) 重複チェック: スワップが正しく行われるよう、文字セット内で文字が重複していないか
    const checkDuplicate = (str: string, label: string) => {
      const chars = Array.from(str);
      const uniqueChars = new Set(chars);
      if (chars.length !== uniqueChars.size) {
        // 重複文字を特定してエラーメッセージに含める
        const dup = chars.filter((item, index) => chars.indexOf(item) !== index);
        throw new Error(`[MappingDef Error] Group "${group.name}" contains duplicate characters in ${label}: ${Array.from(new Set(dup)).join(', ')}`);
      }
    };
    
    checkDuplicate(group.primary, "primary set");
    checkDuplicate(group.secondary, "secondary set");
  });
};