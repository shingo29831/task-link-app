// 役割: タスク名を適切な位置（改行候補）で改行表示するコンポーネント
// なぜ: 単純な文字分断ではなく、意味のある区切りで折り返しを行うため

import React from 'react';
import { getCharWidth, getCharClass, getCharGroup } from '../utils/textUtils';

const isOpenBracket = (c: string) => /^[「（【\[{<『〈《〔〘〚(]$/.test(c);
const isCloseBracket = (c: string) => /^[」）】\]}>』〉》〕〙〛)]$/.test(c);
const multiParticleRegex = /(には|では|から|まで|ので|でも|つつ|また|なお|すると|として|ならば|ながら|および|または)$/;
// 助詞の直前判定用（前方一致）
const multiParticleForwardRegex = /^(には|では|から|まで|ので|でも|つつ|また|なお|すると|として|ならば|ながら|および|または)/;

export const FormattedTaskName = ({ name }: { name: string }) => {
  const MAX_WIDTH = 30; // 1行あたりの最大幅（全角15文字程度）
  const totalWidth = getCharWidth(name);
  
  if (totalWidth <= MAX_WIDTH) return <>{name}</>;

  const breakpoints: { index: number, score: number, width: number }[] = [];
  const widthAt: number[] = [];
  let currentWidth = 0;
  let inBracketCount = 0;
  
  for (let i = 0; i < name.length; i++) {
    const c = name.charCodeAt(i);
    currentWidth += ((c >= 0x0 && c <= 0x7f) || (c >= 0xff61 && c <= 0xff9f)) ? 1 : 2;
    widthAt[i] = currentWidth;
    
    if (i > 0) {
      const prevStr = name.substring(0, i);
      const currStr = name.substring(i);
      const prev = name[i - 1];
      const curr = name[i];

      // カッコのネスト状態を追跡
      if (isOpenBracket(prev)) {
        inBracketCount++;
      } else if (isCloseBracket(prev)) {
        inBracketCount = Math.max(0, inBracketCount - 1);
      }
      
      const prevClass = getCharClass(prev);
      const currClass = getCharClass(curr);
      const prevGroup = getCharGroup(prevClass);
      const currGroup = getCharGroup(currClass);

      let baseScore = 0;

      // 句読点（、。.,）の後ろを最も優先する
      if (/^[、。.,]$/.test(prev)) {
        baseScore = 200;
      } else if (prev === 'を') {
        // 「を」の後ろを有力な候補に
        baseScore = 180;
      } else if ((/^[はがにでとやへもか]$/.test(prev) || multiParticleRegex.test(prevStr)) && prevGroup !== currGroup) {
        // 主要な助詞（1文字・複数文字）の後に文字種が変わる場合（例：〜にはA）を有力な候補に
        baseScore = 170;
      } else if (prevGroup === 'symbol' && currGroup !== 'symbol') {
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

      // カッコの中（inBracketCount > 0）の場合はスコアを大幅に下げる
      if (inBracketCount > 0) {
        baseScore -= 200;
      }

      // 助詞の手前での改行を防ぐため、ペナルティを与える
      if (/^[はがにでとやへもかを]$/.test(curr) || multiParticleForwardRegex.test(currStr)) {
        baseScore -= 100;
      }

      if (baseScore > 0) {
        breakpoints.push({ index: i, score: baseScore, width: widthAt[i - 1] });
      }
    }
  }

  const lines: string[] = [];
  let startIndex = 0;
  let startWidth = 0;

  // 上下の行の文字数差を減らすため、全体の長さから理想の行数と1行あたりの目標幅を算出する
  const lineCount = Math.ceil(totalWidth / MAX_WIDTH);
  const targetWidth = totalWidth / lineCount;
  let currentLine = 1;

  while (startIndex < name.length) {
    const remainingWidth = totalWidth - startWidth;
    
    // 最後の行になる予定、または残りがMAX_WIDTH以下の場合はそのまま追加して終了
    if (currentLine === lineCount || remainingWidth <= MAX_WIDTH) {
      if (remainingWidth <= MAX_WIDTH) {
        lines.push(name.substring(startIndex));
        break;
      }
    }

    let bestPoint = -1;
    let maxFinalScore = -Infinity;

    // MAX_WIDTH以内に収まるブレークポイントを探す
    const validBreakpoints = breakpoints.filter(bp => 
      bp.index > startIndex && (bp.width - startWidth) <= MAX_WIDTH
    );

    if (validBreakpoints.length > 0) {
      for (const bp of validBreakpoints) {
        const currentSegmentWidth = bp.width - startWidth;
        // 目標幅（targetWidth）からの乖離率
        const distanceRatio = Math.abs(targetWidth - currentSegmentWidth) / targetWidth;
        
        // 上下の行の文字数差が大きくならないよう、目標幅から離れるほど強力なペナルティを与える
        const penalty = distanceRatio * 200;
        const finalScore = bp.score - penalty;
        
        if (finalScore > maxFinalScore) {
          maxFinalScore = finalScore;
          bestPoint = bp.index;
        }
      }
    }

    // 適切なブレークポイントが見つからない場合は、強制的にターゲット幅付近で切る
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
    currentLine++;
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