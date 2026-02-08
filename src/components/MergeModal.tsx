import React, { useState, useEffect, useMemo } from 'react';
import { format, addDays } from 'date-fns';
import type { AppData, Task } from '../types';

interface Props {
  localData: AppData;
  incomingData: AppData;
  onConfirm: (merged: AppData) => void;
  onCancel: () => void;
  onCreateNew?: (data: AppData) => void;
}

type ResolveAction = 'USE_LOCAL' | 'USE_REMOTE' | 'DELETE' | 'ADD_REMOTE';
type Priority = 'LOCAL' | 'REMOTE';
type MergeStep = 'ACTION_CHOICE' | 'NAME_CHOICE' | 'TASKS';

interface ComparisonRow {
  key: string; 
  local?: Task;
  remote?: Task;
  action: ResolveAction;
  displayName: string;
  resolvedParentKey?: string; 
  isIdentical: boolean; 
}

interface HierarchicalRow extends ComparisonRow {
    depth: number;
}

export const MergeModal: React.FC<Props> = ({ localData, incomingData, onConfirm, onCancel, onCreateNew }) => {
  const [step, setStep] = useState<MergeStep>(
    localData.projectName !== incomingData.projectName ? 'ACTION_CHOICE' : 'TASKS'
  );
  
  const [projectNameChoice, setProjectNameChoice] = useState<'LOCAL' | 'REMOTE'>('LOCAL');
  const [priority, setPriority] = useState<Priority>('LOCAL');
  const [rows, setRows] = useState<ComparisonRow[]>([]);

  // 差分がない場合に自動で閉じる
  useEffect(() => {
    if (step === 'TASKS' && rows.length > 0) {
      const hasDifferences = rows.some(row => !row.isIdentical);
      if (!hasDifferences) {
        onCancel();
      }
    }
  }, [step, rows, onCancel]);

  const StatusBadge = ({ status }: { status: number }) => {
    const config = {
        0: { l: '未着手', c: '#888' },
        1: { l: '進行中', c: '#007bff' },
        2: { l: '完了', c: '#28a745' },
        3: { l: '休止', c: '#6f42c1' }
    }[status as 0|1|2|3] || { l: '不明', c: '#555' };
    return (
        <span style={{ backgroundColor: config.c, color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75em', marginRight: '6px', whiteSpace: 'nowrap', alignSelf: 'flex-start', marginTop: '2px' }}>{config.l}</span>
    );
  };

  const getDeadlineDisplay = (task: Task, startDate: number) => {
      if (task.deadlineOffset === undefined) return '';
      return format(addDays(startDate, task.deadlineOffset), 'yyyy-MM-dd');
  };

  const breakText = (text: string) => {
    if (text.length <= 15) return text;
    const chunks = [];
    for (let i = 0; i < text.length; i += 15) chunks.push(text.substring(i, i + 15));
    return chunks.map((chunk, i) => <React.Fragment key={i}>{i > 0 && <br />}{chunk}</React.Fragment>);
  };

  const isContentEqual = (a: Task, b: Task) => {
    const deadlineA = a.deadlineOffset ?? null;
    const deadlineB = b.deadlineOffset ?? null;
    const parentA = a.parentId ?? null;
    const parentB = b.parentId ?? null;
    // IDベースなので、名前・ステータス・期限・親IDが一致していれば同一とみなす
    return a.name === b.name && a.status === b.status && deadlineA === deadlineB && parentA === parentB;
  };

  useEffect(() => {
    const newRows: ComparisonRow[] = [];
    const getSimpleDisplayName = (t: Task) => t.name;
    const activeLocalTasks = localData.tasks.filter(t => !t.isDeleted);
    const activeIncomingTasks = incomingData.tasks.filter(t => !t.isDeleted);
    
    const decideAction = (local?: Task, remote?: Task): ResolveAction => {
        if (local && remote) return priority === 'LOCAL' ? 'USE_LOCAL' : 'USE_REMOTE';
        if (!local && remote) return 'ADD_REMOTE';
        return 'USE_LOCAL';
    };

    // IDベースの比較のみを実行
    const allIds = new Set([...activeLocalTasks.map(t => t.id), ...activeIncomingTasks.map(t => t.id)]);
    const localMap = new Map(activeLocalTasks.map(t => [t.id, t]));
    const remoteMap = new Map(activeIncomingTasks.map(t => [t.id, t]));
    
    allIds.forEach(id => {
      const local = localMap.get(id);
      const remote = remoteMap.get(id);
      const parentKey = local?.parentId ?? remote?.parentId;
      const isIdentical = !!(local && remote && isContentEqual(local, remote));
      
      newRows.push({ 
          key: id, 
          local, 
          remote, 
          action: decideAction(local, remote), 
          displayName: local ? getSimpleDisplayName(local) : (remote ? getSimpleDisplayName(remote) : id), 
          resolvedParentKey: parentKey, 
          isIdentical 
      });
    });

    setRows(newRows);
  }, [priority, localData, incomingData]);

  const displayedRows = useMemo(() => {
    const childrenMap = new Map<string, ComparisonRow[]>();
    const roots: ComparisonRow[] = [];
    
    // 親子関係の構築（表示用）
    rows.forEach(r => { 
        // 親IDがrowsの中に存在するか確認。存在しなければルート扱い
        const parentExists = r.resolvedParentKey && rows.some(pr => pr.key === r.resolvedParentKey);
        
        if (parentExists && r.resolvedParentKey) { 
            if (!childrenMap.has(r.resolvedParentKey)) childrenMap.set(r.resolvedParentKey, []); 
            childrenMap.get(r.resolvedParentKey)!.push(r); 
        } else { 
            roots.push(r); 
        } 
    });

    const visibilityMap = new Map<string, boolean>();
    const checkVisibility = (row: ComparisonRow): boolean => {
        if (visibilityMap.has(row.key)) return visibilityMap.get(row.key)!;
        // 差分がある、または子に差分がある場合は表示
        if (!row.isIdentical) { visibilityMap.set(row.key, true); return true; }
        const children = childrenMap.get(row.key) || [];
        const hasVisibleChild = children.some(child => checkVisibility(child));
        visibilityMap.set(row.key, hasVisibleChild); return hasVisibleChild;
    };

    const result: HierarchicalRow[] = [];
    const traverse = (nodes: ComparisonRow[], depth: number) => {
        // 表示順は名前順で見やすくする
        nodes.sort((a, b) => a.displayName.localeCompare(b.displayName));
        nodes.forEach(node => { 
            if (checkVisibility(node)) { 
                result.push({ ...node, depth }); 
                const children = childrenMap.get(node.key); 
                if (children) traverse(children, depth + 1); 
            } 
        });
    };
    traverse(roots, 0); 
    return result;
  }, [rows]);

  const handleRowActionChange = (key: string, act: ResolveAction) => setRows(prev => prev.map(r => r.key === key ? { ...r, action: act } : r));

  const executeMerge = () => {
    const finalTasks: Task[] = [];
    
    rows.forEach(row => {
        if (row.action === 'DELETE') return;
        
        let taskToUse: Task | undefined;
        if (row.action === 'USE_LOCAL' && row.local) { 
            taskToUse = { ...row.local }; 
        } else if (row.action === 'USE_REMOTE' && row.remote) {
            taskToUse = { ...row.remote }; 
        } else if (row.action === 'ADD_REMOTE' && row.remote) {
            taskToUse = { ...row.remote };
        }
        
        if (taskToUse) finalTasks.push(taskToUse);
    });

    // マージ後のタスクセットに含まれない親IDを持つタスクの親リンクを解除
    const finalIds = new Set(finalTasks.map(t => t.id));
    finalTasks.forEach(t => {
        if (t.parentId && !finalIds.has(t.parentId)) {
            t.parentId = undefined;
        }
    });

    onConfirm({ 
        id: localData.id, 
        projectName: projectNameChoice === 'LOCAL' ? localData.projectName : incomingData.projectName, 
        projectStartDate: localData.projectStartDate, 
        tasks: finalTasks, 
        lastSynced: Date.now() 
    });
  };

  if (step === 'ACTION_CHOICE') {
    return (
        <div style={overlayStyle}>
            <div style={modalStyle}>
                <h3>プロジェクト名の競合</h3>
                <p>このプロジェクト名はローカルデータにありません。</p>
                <p>閲覧中: <strong>{localData.projectName}</strong></p>
                <p>インポート: <strong>{incomingData.projectName}</strong></p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                    <button onClick={() => setStep('NAME_CHOICE')} style={btnStyle}>このプロジェクトにマージ</button>
                    {onCreateNew && <button onClick={() => onCreateNew(incomingData)} style={{ ...btnStyle, backgroundColor: '#007bff', borderColor: '#0056b3' }}>新規プロジェクトとして作成</button>}
                    <button onClick={onCancel} style={{ ...btnStyle, backgroundColor: '#555' }}>キャンセル</button>
                </div>
            </div>
        </div>
    );
  }

  if (step === 'NAME_CHOICE') {
    return (
        <div style={overlayStyle}>
            <div style={modalStyle}>
                <h3>プロジェクト名の選択</h3>
                <p>どちらのプロジェクト名を使用しますか？</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                    <button onClick={() => { setProjectNameChoice('LOCAL'); setStep('TASKS'); }} style={btnStyle}>ローカルを使用: <strong>{localData.projectName}</strong></button>
                    <button onClick={() => { setProjectNameChoice('REMOTE'); setStep('TASKS'); }} style={btnStyle}>リモートを使用: <strong>{incomingData.projectName}</strong></button>
                    <button onClick={() => setStep('ACTION_CHOICE')} style={{ ...btnStyle, backgroundColor: '#555' }}>戻る</button>
                </div>
            </div>
        </div>
    );
  }

  if (step === 'TASKS' && displayedRows.length === 0 && rows.length > 0) return null;

  return (
    <div style={overlayStyle}>
        <div style={{ ...modalStyle, width: '1200px', maxWidth: '95vw', height: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ borderBottom: '1px solid #444', paddingBottom: '10px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3 style={{ margin: '0 0 4px 0' }}>タスクのマージ (IDベース)</h3>
                    <div style={{ fontSize: '0.85em', color: '#aaa' }}>Remote: <strong style={{ color: '#fff' }}>{incomingData.projectName}</strong> ➔ Local: <strong style={{ color: '#fff' }}>{localData.projectName}</strong></div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} style={{ padding: '5px', borderRadius: '4px', background: '#333', color: '#fff', border: '1px solid #555' }}>
                        <option value="LOCAL">Local優先</option><option value="REMOTE">Remote優先</option>
                    </select>
                    <button onClick={onCancel} style={{ ...btnStyle, backgroundColor: '#dc3545', border: 'none' }}>キャンセル</button>
                    <button onClick={executeMerge} style={{ ...btnStyle, backgroundColor: '#28a745', border: 'none' }}>実行</button>
                </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {displayedRows.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>差分はありません。すべてのタスクが一致しています。</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
                        <thead><tr style={{ borderBottom: '2px solid #555', textAlign: 'left' }}><th style={{ padding: '8px' }}>Local</th><th style={{ padding: '8px', width: '150px' }}>アクション</th><th style={{ padding: '8px' }}>Remote</th></tr></thead>
                        <tbody>
                            {displayedRows.map((row) => {
                                const localDate = row.local ? getDeadlineDisplay(row.local, localData.projectStartDate) : '';
                                const remoteDate = row.remote ? getDeadlineDisplay(row.remote, incomingData.projectStartDate) : '';
                                const isContextRow = row.isIdentical;
                                const rowOpacity = isContextRow ? 0.6 : 1;
                                
                                return (
                                    <tr key={row.key} style={{ borderBottom: '1px solid #333' }}>
                                        <td style={{ padding: '8px', paddingLeft: `${8 + row.depth * 24}px`, color: row.local ? `rgba(255,255,255,${rowOpacity})` : '#666' }}>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>{row.depth > 0 && <span style={{ marginRight: '6px', color: '#555' }}>└</span>}{row.local ? <div style={{ display: 'flex', alignItems: 'flex-start' }}><StatusBadge status={row.local.status} /><div style={{ display: 'flex', flexDirection: 'column' }}><span>{breakText(row.local.name)}</span>{localDate && <span style={{ fontSize: '0.85em', color: '#aaa' }}>({localDate})</span>}<span style={{fontSize: '0.7em', color:'#555'}}>{row.key}</span></div></div> : '(なし)'}</div>
                                        </td>
                                        <td style={{ padding: '8px', opacity: rowOpacity }}>{isContextRow ? <span style={{ color: '#888', fontSize: '0.85em' }}>（一致）</span> : <select value={row.action} onChange={(e) => handleRowActionChange(row.key, e.target.value as ResolveAction)} style={{ width: '100%', padding: '4px', background: '#222', color: '#fff', border: '1px solid #444' }}>{row.local && row.remote && (<><option value="USE_LOCAL">Local優先</option><option value="USE_REMOTE">Remote優先</option><option value="DELETE">削除</option></>)}{row.local && !row.remote && (<><option value="USE_LOCAL">Local維持</option><option value="DELETE">削除</option></>)}{!row.local && row.remote && (<><option value="ADD_REMOTE">追加</option><option value="DELETE">追加しない</option></>)}</select>}</td>
                                        <td style={{ padding: '8px', paddingLeft: `${8 + row.depth * 24}px`, color: row.remote ? `rgba(255,255,255,${rowOpacity})` : '#666' }}>{row.remote && (<div style={{ display: 'flex', flexDirection: 'column' }}><div style={{ display: 'flex', alignItems: 'center' }}>{row.depth > 0 && <span style={{ marginRight: '6px', color: '#555' }}>└</span>}<div style={{ display: 'flex', alignItems: 'flex-start' }}><StatusBadge status={row.remote.status} /><div style={{ display: 'flex', flexDirection: 'column' }}><span>{breakText(row.remote.name)}</span>{remoteDate && <span style={{ fontSize: '0.85em', color: '#aaa' }}>({remoteDate})</span>}<span style={{fontSize: '0.7em', color:'#555'}}>{row.key}</span></div></div></div></div>)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 };
const modalStyle: React.CSSProperties = { backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '8px', color: '#fff', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' };
const btnStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: '#fff', cursor: 'pointer' };