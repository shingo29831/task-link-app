// 役割: プロジェクト名を適切な位置で改行表示するコンポーネント
import { splitTextIntoLines } from '../utils/textUtils';

export const FormattedProjectName = ({ name }: { name: string }) => {
  // 1回だけ改行するモード（最大幅20）
  const lines = splitTextIntoLines(name, 20, 'single');
  
  if (lines.length <= 1) return <>{name}</>;

  return (
    <span style={{ display: 'inline-block', lineHeight: '1.3', textAlign: 'left', verticalAlign: 'middle' }}>
      {lines[0]}<br/>{lines[1]}
    </span>
  );
};