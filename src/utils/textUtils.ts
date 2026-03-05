// 役割: 文字列の幅計算や文字種判定などのテキスト処理ユーティリティ

export const getCharWidth = (str: string) => {
  let width = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if ((c >= 0x0 && c <= 0x7f) || (c >= 0xff61 && c <= 0xff9f)) width += 1;
    else width += 2;
  }
  return width;
};

export const getCharClass = (c: string) => {
  if (/[ \-_/.=　]/.test(c)) return 'symbol';
  if (/[a-zａ-ｚ]/.test(c)) return 'lower';
  if (/[A-ZＡ-Ｚ]/.test(c)) return 'upper';
  if (/[0-9０-９]/.test(c)) return 'num';
  if (/[\u3040-\u309F]/.test(c)) return 'hiragana';
  if (/[\u30A0-\u30FF\uFF65-\uFF9F]/.test(c)) return 'katakana';
  if (/[\u4E00-\u9FFF]/.test(c)) return 'kanji';
  return 'other';
};

export const getCharGroup = (charClass: string) => {
  if (['lower', 'upper'].includes(charClass)) return 'alpha';
  if (charClass === 'num') return 'num';
  if (['hiragana', 'katakana', 'kanji'].includes(charClass)) return 'japanese';
  if (charClass === 'symbol') return 'symbol';
  return 'other';
};

// --- 改行位置計算用の共通ロジック ---

const isOpenBracket = (c: string) => /^[「（【\[{<『〈《〔〘〚(]$/.test(c);
const isCloseBracket = (c: string) => /^[」）】\]}>』〉》〕〙〛)]$/.test(c);
const multiParticleRegex = /(には|では|から|まで|ので|でも|つつ|また|なお|すると|として|ならば|ながら|および|または)$/;
const multiParticleForwardRegex = /^(には|では|から|まで|ので|でも|つつ|また|なお|すると|として|ならば|ながら|および|または)/;

export const splitTextIntoLines = (text: string, maxWidth: number, mode: 'single' | 'multi'): string[] => {
  const totalWidth = getCharWidth(text);
  if (totalWidth <= maxWidth) return [text];

  const breakpoints: { index: number, score: number, width: number }[] = [];
  const widthAt: number[] = [];
  let currentWidth = 0;
  let inBracketCount = 0;

  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    currentWidth += ((c >= 0x0 && c <= 0x7f) || (c >= 0xff61 && c <= 0xff9f)) ? 1 : 2;
    widthAt[i] = currentWidth;
    
    if (i > 0) {
      const prevStr = text.substring(0, i);
      const currStr = text.substring(i);
      const prev = text[i - 1];
      const curr = text[i];

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
        // 主要な助詞の後に文字種が変わる場合を有力な候補に
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

      // カッコの中の場合はスコアを大幅に下げる
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

  // 中央で1回だけ分割するモード（プロジェクト名などで使用）
  if (mode === 'single') {
    let bestPoint = -1;
    const targetWidth = totalWidth / 2;
    
    const validBreakpoints = breakpoints.filter(bp => {
      const w1 = bp.width;
      const w2 = totalWidth - w1;
      return w1 <= maxWidth && w2 <= maxWidth;
    });

    if (validBreakpoints.length > 0) {
      let maxFinalScore = -Infinity;
      for (const bp of validBreakpoints) {
        const distanceRatio = Math.abs(targetWidth - bp.width) / targetWidth;
        const penalty = distanceRatio * 200;
        const finalScore = bp.score - penalty;
        if (finalScore > maxFinalScore) {
          maxFinalScore = finalScore;
          bestPoint = bp.index;
        }
      }
    } else {
      for (let i = 0; i < text.length; i++) {
        if (widthAt[i] > maxWidth) {
          bestPoint = i;
          break;
        }
      }
      if (bestPoint === -1) {
        bestPoint = Math.floor(text.length / 2);
      }
    }

    return [text.substring(0, bestPoint), text.substring(bestPoint)];
  } 
  
  // 複数行に均等に分割するモード（タスク名などで使用）
  else {
    const lines: string[] = [];
    let startIndex = 0;
    let startWidth = 0;

    const lineCount = Math.ceil(totalWidth / maxWidth);
    const targetWidth = totalWidth / lineCount;
    let currentLine = 1;

    while (startIndex < text.length) {
      const remainingWidth = totalWidth - startWidth;
      
      if (currentLine === lineCount || remainingWidth <= maxWidth) {
        if (remainingWidth <= maxWidth) {
          lines.push(text.substring(startIndex));
          break;
        }
      }

      let bestPoint = -1;
      let maxFinalScore = -Infinity;

      const validBreakpoints = breakpoints.filter(bp => 
        bp.index > startIndex && (bp.width - startWidth) <= maxWidth
      );

      if (validBreakpoints.length > 0) {
        for (const bp of validBreakpoints) {
          const currentSegmentWidth = bp.width - startWidth;
          const distanceRatio = Math.abs(targetWidth - currentSegmentWidth) / targetWidth;
          const penalty = distanceRatio * 200;
          const finalScore = bp.score - penalty;
          
          if (finalScore > maxFinalScore) {
            maxFinalScore = finalScore;
            bestPoint = bp.index;
          }
        }
      }

      if (bestPoint === -1 || bestPoint === startIndex) {
        let forcedPoint = startIndex + 1;
        for (let i = startIndex; i < text.length; i++) {
          if (widthAt[i] - startWidth > targetWidth) {
            forcedPoint = i;
            break;
          }
        }
        bestPoint = Math.min(forcedPoint, text.length);
      }

      lines.push(text.substring(startIndex, bestPoint));
      startWidth = widthAt[bestPoint - 1];
      startIndex = bestPoint;
      currentLine++;
    }

    return lines;
  }
};