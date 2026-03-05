// 役割: プロジェクト名を適切な位置で改行表示するコンポーネント

import { getCharWidth, getCharClass, getCharGroup } from '../utils/textUtils';

const isOpenBracket = (c: string) => /^[「（【\[{<『〈《〔〘〚(]$/.test(c);
const isCloseBracket = (c: string) => /^[」）】\]}>』〉》〕〙〛)]$/.test(c);
const multiParticleRegex = /(には|では|から|まで|ので|でも|つつ|また|なお|すると|として|ならば|ながら|および|または)$/;
// 助詞の直前判定用（前方一致）
const multiParticleForwardRegex = /^(には|では|から|まで|ので|でも|つつ|また|なお|すると|として|ならば|ながら|および|または)/;

export const FormattedProjectName = ({ name }: { name: string }) => {
  const totalWidth = getCharWidth(name);
  if (totalWidth <= 20) return <>{name}</>;

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
        // 主要な助詞（1文字・複数文字）の後に文字種が変わる場合を有力な候補に
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
      
      // 上下の行の文字数差が大きくならないよう、中央から離れるほど強力なペナルティを与える
      const penalty = distanceRatio * 200;
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