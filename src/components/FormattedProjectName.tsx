// 役割: プロジェクト名を適切な位置で改行表示するコンポーネント

import { getCharWidth, getCharClass, getCharGroup } from '../utils/textUtils';

export const FormattedProjectName = ({ name }: { name: string }) => {
  const totalWidth = getCharWidth(name);
  if (totalWidth <= 20) return <>{name}</>;

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

  let bestPoint = -1;
  const targetWidth = totalWidth / 2;
  
  const validBreakpoints = breakpoints.filter(bp => {
    const w1 = bp.width;
    const w2 = totalWidth - w1;
    return w1 <= 20 && w2 <= 20;
  });

  if (validBreakpoints.length > 0) {
    let maxFinalScore = -Infinity;
    
    for (const bp of validBreakpoints) {
      const distanceRatio = Math.abs(targetWidth - bp.width) / targetWidth;
      const penalty = distanceRatio * 40;
      const finalScore = bp.score - penalty;
      
      if (finalScore > maxFinalScore) {
        maxFinalScore = finalScore;
        bestPoint = bp.index;
      }
    }
  } else {
    for (let i = 0; i < name.length; i++) {
      if (widthAt[i] > 20) {
        bestPoint = i;
        break;
      }
    }
    if (bestPoint === -1) {
      bestPoint = Math.floor(name.length / 2);
    }
  }

  const line1 = name.substring(0, bestPoint);
  const line2 = name.substring(bestPoint);

  return (
    <span style={{ display: 'inline-block', lineHeight: '1.3', textAlign: 'left', verticalAlign: 'middle' }}>
      {line1}<br/>{line2}
    </span>
  );
};