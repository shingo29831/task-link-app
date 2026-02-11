import { useState, useEffect } from 'react';

export const useResponsive = () => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    windowWidth,
    // 1280px未満をモバイル・タブレットとして扱う
    isMobile: windowWidth < 1280,
    // 480px以下を極端に狭い画面（スマホ縦など）として扱う
    isNarrowLayout: windowWidth <= 480,
  };
};