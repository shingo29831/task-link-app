import React, { useState, useEffect, useMemo } from 'react';
import { format, addDays } from 'date-fns';
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
  resolvedParentKey?: string; // 階層表示用の親キー
  isIdentical: boolean; // 完全に一致しているかどうかのフラグ
}

interface HierarchicalRow extends ComparisonRow {
    depth: number;
}

export const MergeModal: React.FC<Props> = ({ localData, incomingData, onConfirm, onCancel }) => {
  const [step, setStep] = useState<'PROJECT' | 'TASKS'>(
    localData.projectName !== incomingData.projectName ? 'PROJECT' : 'TASKS'
  );
  const [projectNameChoice, setProjectNameChoice] = useState<'LOCAL' | 'REMOTE'>('LOCAL');
  
  const [mergeMode, setMergeMode] = useState<MergeMode>('NAME');
  const [priority, setPriority] = useState<Priority>('LOCAL');
  
  const [rows, setRows] = useState<ComparisonRow[]>([]);

  // ステータスバッジ
  const StatusBadge = ({ status }: { status: number }) => {
    const config = {
        0: { l: '未着手', c: '#888' },
        1: { l: '進行中', c: '#007bff' },
        2: { l: '完了', c: '#28a745' },
        3: { l: '休止', c: '#6f42c1' }
    }[status as 0|1|2|3] || { l: '不明', c: '#555' };

    return (
        <span style={{
            backgroundColor: config.c,
            color: '#fff',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '0.75em',
            marginRight: '6px',
            whiteSpace: 'nowrap',
            alignSelf: 'flex-start',
            marginTop: '2px'
        }}>
            {config.l}
        </span>
    );
  };

  const getDeadlineDisplay = (task: Task, startDate: number) => {
      if (task.deadlineOffset === undefined) return '';
      return format(addDays(startDate, task.deadlineOffset), 'yyyy-MM-dd');
  };

  const breakText = (text: string) => {
    if (text.length <= 15) return text;
    const chunks = [];
    for (let i = 0; i < text.length; i += 15) {
      chunks.push(text.substring(i, i + 15));
    }
    return chunks.map((chunk, i) => (
      <React.Fragment key={i}>
        {i > 0 && <br />}
        {chunk}
      </React.Fragment>
    ));
  };

  // タスクの内容が一致しているか判定するヘルパー関数
  // JSON経由の場合、undefinedが欠落したりnullになったりする可能性があるため、緩やかに比較します
  const isContentEqual = (a: Task, b: Task) => {
    const deadlineA = a.deadlineOffset ?? null;
    const deadlineB = b.deadlineOffset ?? null;
    
    // IDモードの場合は親IDの一致も確認（構造変更の検知）
    // NAMEモードの場合は親IDは無視（traverseMatchingで構造的にマッチングしているため）
    const parentA = a.parentId ?? null;
    const parentB = b.parentId ?? null;

    return a.name === b.name && 
           a.status === b.status && 
           deadlineA === deadlineB &&
           (mergeMode === 'NAME' || parentA === parentB);
  };

  // Rowsの構築
  useEffect(() => {
    const newRows: ComparisonRow[] = [];
    const getSimpleDisplayName = (t: Task) => t.name;

    // 削除されていないタスクのみを抽出
    const activeLocalTasks = localData.tasks.filter(t => !t.isDeleted);
    const activeIncomingTasks = incomingData.tasks.filter(t => !t.isDeleted);

    const decideAction = (local?: Task, remote?: Task): ResolveAction => {
        if (local && remote) {
            return priority === 'LOCAL' ? 'USE_LOCAL' : 'USE_REMOTE';
        }
        if (!local && remote) {
            return 'ADD_REMOTE';
        }
        return 'USE_LOCAL';
    };

    if (mergeMode === 'ID') {
      const allIds = new Set([...activeLocalTasks.map(t => t.id), ...activeIncomingTasks.map(t => t.id)]);
      const localMap = new Map(activeLocalTasks.map(t => [t.id, t]));
      const remoteMap = new Map(activeIncomingTasks.map(t => [t.id, t]));

      allIds.forEach(id => {
        const local = localMap.get(id);
        const remote = remoteMap.get(id);
        
        const parentKey = local?.parentId ?? remote?.parentId;
        // 両方存在し、内容が一致している場合は Identical とする
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
    } else {
      // NAME Mode
      
      const localChildrenMap = new Map<string, Task[]>();
      activeLocalTasks.forEach(t => {
          const pid = t.parentId ?? 'root';
          if (!localChildrenMap.has(pid)) localChildrenMap.set(pid, []);
          localChildrenMap.get(pid)!.push(t);
      });

      const remoteChildrenMap = new Map<string, Task[]>();
      activeIncomingTasks.forEach(t => {
          const pid = t.parentId ?? 'root';
          if (!remoteChildrenMap.has(pid)) remoteChildrenMap.set(pid, []);
          remoteChildrenMap.get(pid)!.push(t);
      });

      const visitedLocalIds = new Set<string>();
      const visitedRemoteIds = new Set<string>();

      const traverseMatching = (lParentId: string | undefined | null, rParentId: string | undefined | null, parentRowKey: string | undefined) => {
           const lChildren = lParentId === null ? [] : (localChildrenMap.get(lParentId ?? 'root') || []);
           const rChildren = rParentId === null ? [] : (remoteChildrenMap.get(rParentId ?? 'root') || []);
           
           const names = new Set([...lChildren.map(t => t.name), ...rChildren.map(t => t.name)]);
           
           names.forEach(name => {
               const lTask = lChildren.find(t => t.name === name && !visitedLocalIds.has(t.id));
               const rTask = rChildren.find(t => t.name === name && !visitedRemoteIds.has(t.id));
               
               if (lTask || rTask) {
                   if (lTask) visitedLocalIds.add(lTask.id);
                   if (rTask) visitedRemoteIds.add(rTask.id);

                   let rowKey = lTask ? lTask.id : rTask!.id;
                   if (!lTask && rTask) {
                       rowKey = `remote_${rTask.id}`;
                   }
                   
                   const isIdentical = !!(lTask && rTask && isContentEqual(lTask, rTask));

                   newRows.push({
                       key: rowKey,
                       local: lTask,
                       remote: rTask,
                       action: decideAction(lTask, rTask),
                       displayName: name,
                       resolvedParentKey: parentRowKey,
                       isIdentical
                   });
                   
                   traverseMatching(lTask ? lTask.id : null, rTask ? rTask.id : null, rowKey);
               }
           });
      };
      
      traverseMatching(undefined, undefined, undefined);
    }
    
    setRows(newRows);
  }, [mergeMode, priority, localData, incomingData]);


  // 階層構造の計算（表示用）とフィルタリング
  const displayedRows = useMemo(() => {
    const childrenMap = new Map<string, ComparisonRow[]>();
    const roots: ComparisonRow[] = [];
    
    rows.forEach(r => {
        if (r.resolvedParentKey) {
            if (!childrenMap.has(r.resolvedParentKey)) childrenMap.set(r.resolvedParentKey, []);
            childrenMap.get(r.resolvedParentKey)!.push(r);
        } else {
            roots.push(r);
        }
    });

    // フィルタリングのための可視性判定マップ
    // キー: 行のkey, 値: 表示するかどうか
    const visibilityMap = new Map<string, boolean>();

    const checkVisibility = (row: ComparisonRow): boolean => {
        if (visibilityMap.has(row.key)) return visibilityMap.get(row.key)!;
        
        // 1. 差分がある（一致していない）場合は必ず表示
        if (!row.isIdentical) {
            visibilityMap.set(row.key, true);
            return true;
        }

        // 2. 一致している場合でも、子孫に表示すべき行があれば表示（階層維持のため）
        const children = childrenMap.get(row.key) || [];
        const hasVisibleChild = children.some(child => checkVisibility(child));
        
        visibilityMap.set(row.key, hasVisibleChild);
        return hasVisibleChild;
    };

    const result: HierarchicalRow[] = [];
    
    const traverse = (nodes: ComparisonRow[], depth: number) => {
        nodes.sort((a, b) => {
            if (mergeMode === 'NAME') {
                return a.displayName.localeCompare(b.displayName);
            } else {
                return a.key.localeCompare(b.key, undefined, { numeric: true });
            }
        });

        nodes.forEach(node => {
            // 可視と判定された場合のみリストに追加
            if (checkVisibility(node)) {
                result.push({ ...node, depth });
                const children = childrenMap.get(node.key);
                if (children) traverse(children, depth + 1);
            }
        });
    };

    traverse(roots, 0);
    return result;
  }, [rows, mergeMode]);


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
        <div style={{ ...modalStyle, width: '1200px', maxWidth: '95vw', height: '80vh', display: 'flex', flexDirection: 'column' }}>
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
                {displayedRows.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                        差分はありません。すべてのタスクが一致しています。
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #555', textAlign: 'left' }}>
                                <th style={{ padding: '8px' }}>Local</th>
                                <th style={{ padding: '8px', width: '150px' }}>アクション</th>
                                <th style={{ padding: '8px' }}>Remote</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedRows.map((row) => {
                                const localDate = row.local ? getDeadlineDisplay(row.local, localData.projectStartDate) : '';
                                const remoteDate = row.remote ? getDeadlineDisplay(row.remote, incomingData.projectStartDate) : '';
                                
                                // 一致しているが子孫のために表示されている行は少し薄くするなどのスタイル
                                const isContextRow = row.isIdentical;
                                const rowOpacity = isContextRow ? 0.6 : 1;

                                return (
                                    <tr key={row.key} style={{ borderBottom: '1px solid #333' }}>
                                        <td style={{ 
                                            padding: '8px', 
                                            paddingLeft: `${8 + row.depth * 24}px`,
                                            color: row.local ? `rgba(255,255,255,${rowOpacity})` : '#666' 
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                {row.depth > 0 && <span style={{ marginRight: '6px', color: '#555', userSelect: 'none' }}>└</span>}
                                                {row.local ? (
                                                    <div style={{ display: 'flex', alignItems: 'flex-start' }} title={`ID: ${row.local.id}`}>
                                                        <StatusBadge status={row.local.status} />
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span>{breakText(row.local.name)}</span>
                                                            {localDate && <span style={{ fontSize: '0.85em', color: '#aaa' }}>({localDate})</span>}
                                                        </div>
                                                    </div>
                                                ) : '(なし)'}
                                            </div>
                                        </td>
                                        
                                        <td style={{ padding: '8px', opacity: rowOpacity }}>
                                            {isContextRow ? (
                                                <span style={{ color: '#888', fontSize: '0.85em' }}>（一致）</span>
                                            ) : (
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
                                            )}
                                        </td>

                                        <td style={{ 
                                            padding: '8px', 
                                            paddingLeft: `${8 + row.depth * 24}px`,
                                            color: row.remote ? `rgba(255,255,255,${rowOpacity})` : '#666' 
                                        }}>
                                            {row.remote && (
                                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                                    {row.depth > 0 && <span style={{ marginRight: '6px', color: '#555', userSelect: 'none' }}>└</span>}
                                                    <div style={{ display: 'flex', alignItems: 'flex-start' }} title={`ID: ${row.remote.id}`}>
                                                        <StatusBadge status={row.remote.status} />
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span>{breakText(row.remote.name)}</span>
                                                            {remoteDate && <span style={{ fontSize: '0.85em', color: '#aaa' }}>({remoteDate})</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </td>
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