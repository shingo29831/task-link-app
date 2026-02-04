import React from 'react';
import { useAppData } from './hooks/useAppData';

function App() {
  const { data, setData, getShareUrl } = useAppData();

  if (!data) return <div>Loading...</div>;

  const handleCopyLink = () => {
    const url = getShareUrl();
    navigator.clipboard.writeText(url);
    alert('リンクをコピーしました！');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>進捗共有アプリ</h1>
      <button onClick={handleCopyLink}>共有リンクをコピー</button>
      
      {/* ここに Controls や TaskList コンポーネントを配置 */}
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

export default App;