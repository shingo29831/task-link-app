import React, { useState, useEffect, useMemo } from 'react';
import type { AppData, Task } from '../types';

interface Props {
  localData: AppData;
  incomingData: AppData;
  onConfirm: (merged: AppData) => void;
  onCancel: () => void;
}

type MergeMode = 'ID' | 'NAME';
type ResolveAction = 'USE_LOCAL' | 'USE_REMOTE' | 'DELETE' | 'ADD_REMOTE';
type Priority = 'LOCAL' | 'REMOTE';
type StrategyOption = 'CUSTOM' | 'NO_MERGE' | 'NAME' | 'ID';

interface ComparisonRow {
  key: string; // ID or Name
  local?: Task;
  remote?: Task;
  action: ResolveAction;
  displayName: string;
}

interface HierarchicalRow extends ComparisonRow {
    depth: number;
}

export const MergeModal: React.FC<Props> = ({ localData, incomingData, onConfirm, onCancel }) => {
  const [step, setStep] = useState<'PROJECT' | 'TASKS'>(
    localData.projectName !== incomingData.projectName ? 'PROJECT' : 'TASKS'
  );
  const [projectNameChoice, setProjectNameChoice] = useState<'LOCAL' | 'REMOTE'>('LOCAL');
  
  // マージ設定
  const [mergeMode, setMergeMode] = useState<MergeMode>('NAME');
  const [priority, setPriority] = useState<Priority>('LOCAL');
  const [strategySelect, setStrategySelect] = useState<StrategyOption>('NAME');
  
  const [rows, setRows] = useState<ComparisonRow[]>([]);

  // Rowsの構築（データの突合 + 初期アクション決定）
  useEffect(() => {
    const newRows: ComparisonRow[] = [];
    const getSimpleDisplayName = (t: Task) => t.name;

    // 優先度に基づくデフォルトアクション決定ロジック
    const decideAction = (local?: Task, remote?: Task): ResolveAction => {
        if (local && remote) {
            // 競合: 優先度に従う
            return priority === 'LOCAL' ? 'USE_LOCAL' : 'USE_REMOTE';
        }
        if (!local && remote) {
            // Remoteのみ: Remote優先なら追加、Local優先なら無視(削除)
            return priority === 'REMOTE' ? 'ADD_REMOTE' : 'DELETE';
        }
        if (local && !remote) {
            // Localのみ: 基本維持
            return 'USE_LOCAL';
        }
        return 'USE_LOCAL';
    };

    if (mergeMode === 'ID') {
      const allIds = new Set([...localData.tasks.map(t => t.id), ...incomingData.tasks.map(t => t.id)]);
      const localMap = new Map(localData.tasks.map(t => [t.id, t]));
      const remoteMap = new Map(incomingData.tasks.map(t => [t.id, t]));

      allIds.forEach(id => {
        const local = localMap.get(id);
        const remote = remoteMap.get(id);
        
        newRows.push({
          key: id,
          local,
          remote,
          action: decideAction(local, remote),
          displayName: local ? getSimpleDisplayName(local) : (remote ? getSimpleDisplayName(remote) : id)
        });
      });
    } else {
      // NAME Mode
      const allNames = new Set([
          ...localData.tasks.filter(t => !t.isDeleted).map(t => t.name),
          ...incomingData.tasks.filter(t => !t.isDeleted).map(t => t.name)
      ]);
      const localMap = new Map(localData.tasks.map(t => [t.name, t]));
      const remoteMap = new Map(incomingData.tasks.map(t => [t.name, t]));

      allNames.forEach(name => {
        const local = localMap.get(name);
        const remote = remoteMap.get(name);
        
        newRows.push({
          key: name,
          local,
          remote,
          action: decideAction(local, remote),
          displayName: name
        });
      });
    }
    
    setRows(newRows);
    // 自動再計算時はSelectの表示を現在のモードに合わせる
    setStrategySelect(mergeMode);
  }, [mergeMode, priority, localData, incomingData]);


  // 階層構造の計算（表示用）
  const displayedRows = useMemo(() => {
    const idToKeyMap = new Map<string, string>();
    if (mergeMode === 'NAME') {
        [...localData.tasks, ...incomingData.tasks].forEach(t => {
            if (!t.isDeleted) idToKeyMap.set(t.id, t.name);
        });
    }

    const getParentKey = (r: ComparisonRow): string | undefined => {
        const t = r.local || r.remote;
        if (!t || !t.parentId) return undefined;
        return mergeMode === 'ID' ? t.parentId : idToKeyMap.get(t.parentId);
    };

    const childrenMap = new Map<string, ComparisonRow[]>();
    const roots: ComparisonRow[] = [];
    const rowKeySet = new Set(rows.map(r => r.key));

    rows.forEach(r => {
        const parentKey = getParentKey(r);
        if (parentKey && rowKeySet.has(parentKey)) {
            if (!childrenMap.has(parentKey)) childrenMap.set(parentKey, []);
            childrenMap.get(parentKey)!.push(r);
        } else {
            roots.push(r);
        }
    });

    const result: HierarchicalRow[] = [];
    const traverse = (nodes: ComparisonRow[], depth: number) => {
        nodes.sort((a, b) => a.displayName.localeCompare(b.displayName));
        nodes.forEach(node => {
            result.push({ ...node, depth });
            const children = childrenMap.get(node.key);
            if (children) traverse(children, depth + 1);
        });
    };

    traverse(roots, 0);
    return result;
  }, [rows, mergeMode, localData, incomingData]);


  // マージ戦略（右側のSelect）変更時のハンドラ
  const handleStrategyChange = (val: string) => {
    const selected = val as StrategyOption;
    
    if (selected === 'CUSTOM') {
        setStrategySelect('CUSTOM');
        return;
    }

    if (selected === 'NO_MERGE') {
        setStrategySelect('NO_MERGE');
        // 全行を「マージしない（Local維持 or 削除）」に設定
        setRows(prev => prev.map(r => ({
            ...r,
            action: r.local ? 'USE_LOCAL' : 'DELETE'
        })));
        return;
    }

    // NAME or ID
    setMergeMode(selected); // これによりuseEffectが発火し、rowsが再構築される
  };

  // 個別のアクション変更時のハンドラ
  const handleRowActionChange = (key: string, act: ResolveAction) => {
      setRows(prev => prev.map(r => r.key === key ? { ...r, action: act } : r));
      setStrategySelect('CUSTOM'); // 個別に変更したら「カスタマイズ」表示にする
  };

  const executeMerge = () => {
    const finalTasks: Task[] = [];
    const idMap = new Map<string, string>(); // OldRemoteID -> NewLocalID
    
    let maxIdVal = 0;
    localData.tasks.forEach(t => {
        const v = parseInt(t.id, 36);
        if (!isNaN(v) && v > maxIdVal) maxIdVal = v;
    });
    
    const generateId = () => { maxIdVal++; return maxIdVal.toString(36); };

    rows.forEach(row => {
        if (row.action === 'DELETE') return;

        let taskToUse: Task | undefined;
        if (row.action === 'USE_LOCAL' && row.local) {
            taskToUse = { ...row.local };
            if (mergeMode === 'NAME' && row.remote) {
                idMap.set(row.remote.id, row.local.id);
            }
        } 
        else if (row.action === 'USE_REMOTE' && row.local && row.remote) {
            taskToUse = { ...row.remote, id: row.local.id };
            idMap.set(row.remote.id, row.local.id);
        }
        else if (row.action === 'ADD_REMOTE' && row.remote) {
            if (mergeMode === 'NAME') {
                const newId = generateId();
                taskToUse = { ...row.remote, id: newId };
                idMap.set(row.remote.id, newId);
            } else {
                taskToUse = { ...row.remote };
            }
        }

        if (taskToUse) finalTasks.push(taskToUse);
    });

    finalTasks.forEach(t => {
        if (t.parentId && idMap.has(t.parentId)) {
            t.parentId = idMap.get(t.parentId);
        } 
    });

    onConfirm({
        projectName: projectNameChoice === 'LOCAL' ? localData.projectName : incomingData.projectName,
        projectStartDate: localData.projectStartDate,
        tasks: finalTasks,
        lastSynced: Date.now()
    });
  };

  if (step === 'PROJECT') {
    return (
        <div style={overlayStyle}>
            <div style={modalStyle}>
                <h3>プロジェクト名の競合</h3>
                <p>プロジェクト名が異なります。</p>
                <p>Local: {localData.projectName}</p>\
                <p>Remote: {incomingData.projectName}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                    <button onClick={onCancel} style={btnStyle}>マージしない (中止)</button>
                    <button onClick={() => { setProjectNameChoice('LOCAL'); setStep('TASKS'); }} style={btnStyle}>マージ先(Local)のプロジェクト名を適用</button>
                    <button onClick={() => { setProjectNameChoice('REMOTE'); setStep('TASKS'); }} style={btnStyle}>マージ元(Remote)のプロジェクト名を適用</button>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div style={overlayStyle}>
        <div style={{ ...modalStyle, width: '900px', maxWidth: '95vw', height: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ borderBottom: '1px solid #444', paddingBottom: '10px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>タスクのマージオプション</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {/* 優先度選択 Select */}
                    <select 
                        value={priority} 
                        onChange={(e) => setPriority(e.target.value as Priority)} 
                        style={{ padding: '5px', borderRadius: '4px', background: '#333', color: '#fff', border: '1px solid #555' }}
                        title="競合時および新規タスクの扱いを決定します"
                    >
                        <option value="LOCAL">マージ先(Local)優先</option>
                        <option value="REMOTE">マージ元(Remote)優先</option>
                    </select>

                    {/* マージ戦略選択 Select */}
                    <select 
                        value={strategySelect} 
                        onChange={(e) => handleStrategyChange(e.target.value)} 
                        style={{ padding: '5px', borderRadius: '4px', background: '#333', color: '#fff', border: '1px solid #555' }}
                    >
                        <option value="CUSTOM">カスタマイズ</option>
                        <option value="NO_MERGE">マージしない</option>
                        <option value="NAME">タスク名マージ</option>
                        <option value="ID">タスクIDマージ</option>
                    </select>

                    <button onClick={executeMerge} style={{ ...btnStyle, backgroundColor: '#28a745', border: 'none' }}>実行</button>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #555', textAlign: 'left' }}>
                            <th style={{ padding: '8px' }}>マージ先 (Local)</th>
                            <th style={{ padding: '8px', width: '150px' }}>アクション</th>
                            <th style={{ padding: '8px' }}>マージ元 (Remote)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedRows.map((row) => (
                            <tr key={row.key} style={{ borderBottom: '1px solid #333' }}>
                                <td style={{ 
                                    padding: '8px', 
                                    paddingLeft: `${8 + row.depth * 24}px`,
                                    color: row.local ? '#fff' : '#666' 
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        {row.depth > 0 && <span style={{ marginRight: '6px', color: '#555', userSelect: 'none' }}>└</span>}
                                        {row.local ? (
                                            <div title={`ID: ${row.local.id}\nStatus: ${row.local.status}`}>
                                                {row.local.name} <span style={{fontSize: '0.8em', color: '#888'}}>({row.local.status === 2 ? '完了' : '未完'})</span>
                                            </div>
                                        ) : '(なし)'}
                                    </div>
                                </td>
                                
                                <td style={{ padding: '8px' }}>
                                    <select 
                                        value={row.action} 
                                        onChange={(e) => handleRowActionChange(row.key, e.target.value as ResolveAction)}
                                        style={{ width: '100%', padding: '4px', background: '#222', color: '#fff', border: '1px solid #444' }}
                                    >
                                        {row.local && row.remote && (
                                            <>
                                                <option value="USE_LOCAL">マージ先優先</option>
                                                <option value="USE_REMOTE">マージ元優先</option>
                                                <option value="DELETE">差分を削除</option>
                                            </>
                                        )}
                                        {row.local && !row.remote && (
                                            <>
                                                <option value="USE_LOCAL">マージ先優先(維持)</option>
                                                <option value="DELETE">差分を削除</option>
                                            </>
                                        )}
                                        {!row.local && row.remote && (
                                            <>
                                                <option value="ADD_REMOTE">マージ元優先(追加)</option>
                                                <option value="DELETE">差分を削除</option>
                                            </>
                                        )}
                                    </select>
                                </td>

                                <td style={{ 
                                    padding: '8px', 
                                    paddingLeft: `${8 + row.depth * 24}px`,
                                    color: row.remote ? '#fff' : '#666' 
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        {row.depth > 0 && <span style={{ marginRight: '6px', color: '#555', userSelect: 'none' }}>└</span>}
                                        {row.remote ? (
                                            <div title={`ID: ${row.remote.id}\nStatus: ${row.remote.status}`}>
                                                {row.remote.name} <span style={{fontSize: '0.8em', color: '#888'}}>({row.remote.status === 2 ? '完了' : '未完'})</span>
                                            </div>
                                        ) : '(なし)'}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center',
    alignItems: 'center', zIndex: 2000
};

const modalStyle: React.CSSProperties = {
    backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '8px',
    color: '#fff', boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
};

const btnStyle: React.CSSProperties = {
    padding: '8px 16px', borderRadius: '4px', border: '1px solid #555',
    backgroundColor: '#333', color: '#fff', cursor: 'pointer'
};