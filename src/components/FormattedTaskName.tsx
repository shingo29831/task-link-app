// 役割: タスク名を適切な位置（改行候補）で改行表示するコンポーネント
// なぜ: 単純な文字分断ではなく、意味のある区切りで折り返しを行うため

import React from 'react';
import { splitTextIntoLines } from '../utils/textUtils';

export const FormattedTaskName = ({ name }: { name: string }) => {
  // 1行あたりの最大幅（全角15文字程度）
  const lines = splitTextIntoLines(name, 30, 'multi');
  
  if (lines.length <= 1) return <>{name}</>;

  // span (inline-block) で囲むと親要素からの text-decoration (line-through) が
  // 各行に正しく適用されないため、フラグメントで直接展開する
  return (
    <>
      {lines.map((line, idx) => (
        <React.Fragment key={idx}>
          {line}
          {idx < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </>
  );
};