// 役割: タスク名を適切な位置（改行候補）で改行表示するコンポーネント
// なぜ: 単純な文字分断ではなく、意味のある区切りで折り返しを行うため

import React from 'react';
import { splitTextIntoLines } from '../utils/textUtils';

export const FormattedTaskName = ({ name }: { name: string }) => {
  // 1行あたりの最大幅（全角15文字程度）
  const lines = splitTextIntoLines(name, 30, 'multi');
  
  if (lines.length <= 1) return <>{name}</>;

  return (
    <span style={{ display: 'inline-block', lineHeight: '1.4', textAlign: 'left', verticalAlign: 'middle' }}>
      {lines.map((line, idx) => (
        <React.Fragment key={idx}>
          {line}
          {idx < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </span>
  );
};