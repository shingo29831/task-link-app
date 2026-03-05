// 役割: タスク名を適切な位置（改行候補）で改行表示するコンポーネント
// なぜ: 単純な文字分断ではなく、意味のある区切りで折り返しを行うため

import React from 'react';
import { getCharWidth, getCharClass, getCharGroup } from '../utils/textUtils';

export const FormattedTaskName = ({ name }: { name: string }) => {
  const MAX_WIDTH = 30; // 1行あたりの最大幅（全角15文字程度）
  const totalWidth = getCharWidth(name);
  
  if (totalWidth <= MAX_WIDTH) return <>{name}</>;

  const breakpoints: { index: number, score: number, width: number }[] = [];
  const widthAt: number[] = [];
  let currentWidth = 0;
  
  for (let i = 0; i < name.length; i++) {
    const c = name.charCodeAt(i);
    currentWidth += ((c >= 0x0 && c <= 0x7f) || (c >= 0xff61 && c <= 0xff9f)) ? 1 : 2;
    widthAt[i] = currentWidth;
    
    if (i > 0) {
      const prev = name[i - 1];
      const curr = name[i];
      
      const prevClass = getCharClass(prev);
      const currClass = getCharClass(curr);
      const prevGroup = getCharGroup(prevClass);
      const currGroup = getCharGroup(currClass);

      let baseScore = 0;

      if (prevGroup === 'symbol' && currGroup !== 'symbol') {
        baseScore = 120;
      } else if (prevGroup !== currGroup && prevGroup !== 'symbol' && currGroup !== 'symbol') {
        baseScore = 100;
      } else if (prevGroup !== 'symbol' && currGroup === 'symbol') {
        baseScore = 90;
      } else if (prevGroup === currGroup && prevClass !== currClass) {
        if (prevClass === 'lower' && currClass === 'upper') {
          baseScore = 60;
        } else if (prevGroup === 'japanese') {
          baseScore = 40;
        }
      }

      if (baseScore > 0) {
        breakpoints.push({ index: i, score: baseScore, width: widthAt[i - 1] });
      }
    }
  }

  const lines: string[] = [];
  let startIndex = 0;
  let startWidth = 0;

  while (startIndex < name.length) {
    const remainingWidth = totalWidth - startWidth;
    if (remainingWidth <= MAX_WIDTH) {
      lines.push(name.substring(startIndex));
      break;
    }

    const targetWidth = MAX_WIDTH;
    let bestPoint = -1;
    let maxFinalScore = -Infinity;

    // 現在の行の幅がMAX_WIDTH以内に収まるブレークポイントを探す
    const validBreakpoints = breakpoints.filter(bp => 
      bp.index > startIndex && (bp.width - startWidth) <= targetWidth
    );

    if (validBreakpoints.length > 0) {
      for (const bp of validBreakpoints) {
        const currentSegmentWidth = bp.width - startWidth;
        // 目標幅（MAX_WIDTH）に近いほどペナルティが少ない
        const distanceRatio = Math.abs(targetWidth - currentSegmentWidth) / targetWidth;
        const penalty = distanceRatio * 40;
        const finalScore = bp.score - penalty;
        
        if (finalScore > maxFinalScore) {
          maxFinalScore = finalScore;
          bestPoint = bp.index;
        }
      }
    }

    // 適切なブレークポイントが見つからない場合は、強制的にMAX_WIDTH付近で切る
    if (bestPoint === -1 || bestPoint === startIndex) {
      let forcedPoint = startIndex + 1;
      for (let i = startIndex; i < name.length; i++) {
        if (widthAt[i] - startWidth > targetWidth) {
          forcedPoint = i;
          break;
        }
      }
      bestPoint = Math.min(forcedPoint, name.length);
    }

    lines.push(name.substring(startIndex, bestPoint));
    startWidth = widthAt[bestPoint - 1];
    startIndex = bestPoint;
  }

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