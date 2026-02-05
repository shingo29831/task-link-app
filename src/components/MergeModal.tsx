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
  
  const [rows, setRows] = useState<ComparisonRow[]>([]);

  // Rowsの構築
  useEffect(() => {
    const newRows: ComparisonRow[] = [];
    const getSimpleDisplayName = (t: Task) => t.name;

    const decideAction = (local?: Task, remote?: Task): ResolveAction => {
        if (local && remote) {
            return priority === 'LOCAL' ? 'USE_LOCAL' : 'USE_REMOTE';
        }
        if (!local && remote) {
            return 'ADD_REMOTE';
        }
        if (local && !remote) {
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
  }, [mergeMode, priority, localData, incomingData]);


  // 階層構造の計算（表示用）
  const displayedRows = useMemo(() => {
    const localIdToName = new Map<string, string>();
    localData.tasks.forEach(t => {
        if (!t.isDeleted) localIdToName.set(t.id, t.name);
    });

    const remoteIdToName = new Map<string, string>();
    incomingData.tasks.forEach(t => {
        if (!t.isDeleted) remoteIdToName.set(t.id, t.name);
    });

    const getParentKey = (r: ComparisonRow): string | undefined => {
        if (mergeMode === 'ID') {
            return r.local?.parentId ?? r.remote?.parentId;
        }

        // NAMEモード
        // 1. Localタスクが存在する場合、Localの親子関係を優先
        if (r.local && r.local.parentId) {
            return localIdToName.get(r.local.parentId);
        }

        // 2. Remoteタスクが存在する場合
        if (r.remote && r.remote.parentId) {
             return remoteIdToName.get(r.remote.parentId);
        }

        return undefined;
    };

    const childrenMap = new Map<string, ComparisonRow[]>();
    const roots: ComparisonRow[] = [];
    const rowKeySet = new Set(rows.map(r => r.key));

    rows.forEach(r => {
        const parentKey = getParentKey(r);
        // 親キーが存在し、かつその親が行として存在する場合のみ子として扱う
        if (parentKey && rowKeySet.has(parentKey)) {
            if (!childrenMap.has(parentKey)) childrenMap.set(parentKey, []);
            childrenMap.get(parentKey)!.push(r);
        } else {
            roots.push(r);
        }
    });

    const result: HierarchicalRow[] = [];
    const traverse = (nodes: ComparisonRow[], depth: number) => {
        nodes.sort((a, b) => {
            if (mergeMode === 'NAME') {
                return a.displayName.localeCompare(b.displayName);
            } else {
                const idA = a.local?.id ?? a.remote?.id ?? a.key;
                const idB = b.local?.id ?? b.remote?.id ?? b.key;
                return idA.localeCompare(idB, undefined, { numeric: true });
            }
        });

        nodes.forEach(node => {
            result.push({ ...node, depth });
            const children = childrenMap.get(node.key);
            if (children) traverse(children, depth + 1);
        });
    };

    traverse(roots, 0);
    return result;
  }, [rows, mergeMode, localData, incomingData]);


  const handleRowActionChange = (key: string, act: ResolveAction) => {
      setRows(prev => prev.map(r => r.key === key ? { ...r, action: act } : r));
  };

  const executeMerge = () => {
    const finalTasks: Task[] = [];
    const idMap = new Map<string, string>(); // OldRemoteID -> NewLocalID
    
    let maxIdVal = 0;
    localData.tasks.forEach(t => {
        const v = parseInt(t.id, 36);
        if (!isNaN(v) && v > maxIdVal) maxIdVal = v;
    });
    
    // 修正済み
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
                <p>Local: {localData.projectName}</p>
                <p>Remote: {incomingData.projectName}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                    <button onClick={onCancel} style={btnStyle}>マージしない (中止)</button>
                    <button onClick={() => { setProjectNameChoice('LOCAL'); setStep('TASKS'); }} style={btnStyle}>Localのプロジェクト名を適用</button>
                    <button onClick={() => { setProjectNameChoice('REMOTE'); setStep('TASKS'); }} style={btnStyle}>Remoteのプロジェクト名を適用</button>
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
                    
                    <select
                        value={mergeMode}
                        onChange={(e) => setMergeMode(e.target.value as MergeMode)}
                        style={{ padding: '5px', borderRadius: '4px', background: '#333', color: '#fff', border: '1px solid #555' }}
                        title="リストの表示順とマージ基準を選択"
                    >
                        <option value="NAME">タスク名</option>
                        <option value="ID">タスクID</option>
                    </select>

                    <select 
                        value={priority} 
                        onChange={(e) => setPriority(e.target.value as Priority)} 
                        style={{ padding: '5px', borderRadius: '4px', background: '#333', color: '#fff', border: '1px solid #555' }}
                        title="競合時の優先度を選択します"
                    >
                        <option value="LOCAL">Local優先</option>
                        <option value="REMOTE">Remote優先</option>
                    </select>

                    <button onClick={onCancel} style={{ ...btnStyle, backgroundColor: '#dc3545', border: 'none' }}>キャンセル</button>
                    <button onClick={executeMerge} style={{ ...btnStyle, backgroundColor: '#28a745', border: 'none' }}>実行</button>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #555', textAlign: 'left' }}>
                            <th style={{ padding: '8px' }}>Local</th>
                            <th style={{ padding: '8px', width: '150px' }}>アクション</th>
                            <th style={{ padding: '8px' }}>Remote</th>
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
                                                <option value="USE_LOCAL">Local優先</option>
                                                <option value="USE_REMOTE">Remote優先</option>
                                                <option value="DELETE">差分を削除</option>
                                            </>
                                        )}
                                        {row.local && !row.remote && (
                                            <>
                                                <option value="USE_LOCAL">Local維持</option>
                                                <option value="DELETE">差分を削除</option>
                                            </>
                                        )}
                                        {!row.local && row.remote && (
                                            <>
                                                <option value="ADD_REMOTE">追加</option>
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