import React, { useState, useEffect, useMemo } from 'react';
import { format, addDays } from 'date-fns';
import type { AppData, Task } from '../types';
import { to185 } from '../utils/compression'; 

interface Props {
  localData: AppData;
  incomingData: AppData;
  onConfirm: (merged: AppData) => void;
  onCancel: () => void;
  onCreateNew?: (data: AppData) => void;
}

type ResolveAction = 'USE_LOCAL' | 'USE_REMOTE' | 'DELETE' | 'ADD_REMOTE';
type Priority = 'LOCAL' | 'REMOTE';
type MergeStep = 'ACTION_CHOICE' | 'NAME_CHOICE' | 'TASKS' | 'IGNORED_SELECT';

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

  // リネーム管理用
  const [renames, setRenames] = useState<Map<string, string>>(new Map());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');

  // 無視される可能性のあるリモートタスクの選択管理用
  const [ignoredIds, setIgnoredIds] = useState<Set<string>>(new Set());
  const [selectedIgnoredIds, setSelectedIgnoredIds] = useState<Set<string>>(new Set());

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
    
    rows.forEach(r => { 
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
        if (!row.isIdentical) { visibilityMap.set(row.key, true); return true; }
        const children = childrenMap.get(row.key) || [];
        const hasVisibleChild = children.some(child => checkVisibility(child));
        visibilityMap.set(row.key, hasVisibleChild); return hasVisibleChild;
    };

    const result: HierarchicalRow[] = [];
    const traverse = (nodes: ComparisonRow[], depth: number) => {
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

  // 重複チェックロジック（リアルタイム表示用）
  const duplicateKeys = useMemo(() => {
    const nameMap = new Map<string, string[]>(); // key: "parentId:name", value: [rowKey1, rowKey2, ...]
    const duplicates = new Set<string>();

    rows.forEach(row => {
        if (row.action === 'DELETE') return;

        let name = '';
        // どのタスクが採用されるか判定
        if (row.action === 'USE_LOCAL' && row.local) {
            name = renames.get(row.key) || row.local.name;
        } else if ((row.action === 'USE_REMOTE' || row.action === 'ADD_REMOTE') && row.remote) {
            name = renames.get(row.key) || row.remote.name;
        }

        if (!name) return;

        // 親IDの簡易判定 (resolvedParentKeyを使用)
        // ※ ID変更後の厳密な親ID追従はこの段階では複雑すぎるため、現在の階層構造を基準とする
        const groupKey = `${row.resolvedParentKey || 'root'}:${name}`;
        if (!nameMap.has(groupKey)) {
            nameMap.set(groupKey, []);
        }
        nameMap.get(groupKey)!.push(row.key);
    });

    nameMap.forEach((keys) => {
        if (keys.length > 1) {
            keys.forEach(k => duplicates.add(k));
        }
    });

    return duplicates;
  }, [rows, renames]);

  const handleRowActionChange = (key: string, act: ResolveAction) => setRows(prev => prev.map(r => r.key === key ? { ...r, action: act } : r));

  // リネーム関連処理
  const handleStartRename = (id: string, currentName: string) => {
      setEditingId(id);
      setTempName(renames.get(id) || currentName);
  };

  const handleSaveRename = () => {
      if (editingId && tempName.trim()) {
          const newRenames = new Map(renames);
          newRenames.set(editingId, tempName.trim());
          setRenames(newRenames);
          setEditingId(null);
      } else {
          alert('タスク名は空にできません');
      }
  };

  const handleCancelRename = () => {
      setEditingId(null);
      setTempName('');
  };

  // 「実行」ボタンが押されたときの処理
  const handleInitialMerge = () => {
    // 重複がある場合は実行させない
    if (duplicateKeys.size > 0) {
        alert('名前が重複しているタスクがあります。名前を変更するか、どちらか一方を削除してください。');
        return;
    }

    const candidates = rows.filter(
        r => r.local && r.remote && !r.isIdentical && r.action === 'USE_LOCAL'
    );

    if (candidates.length > 0) {
        const candidateIds = new Set(candidates.map(r => r.key));
        setIgnoredIds(candidateIds);
        setSelectedIgnoredIds(candidateIds);
        setStep('IGNORED_SELECT');
    } else {
        finalizeMerge(new Set());
    }
  };

  // 最終的なマージ処理
  const finalizeMerge = (idsToResurrect: Set<string>) => {
    const finalTasks: Task[] = [];
    
    // 1. 全ての使用済みIDを収集 (Local + Remote)
    const usedIds = new Set<string>();
    localData.tasks.forEach(t => usedIds.add(t.id));
    incomingData.tasks.forEach(t => usedIds.add(t.id));

    // ID置換マップ: 旧ID -> 新ID
    const localIdMap = new Map<string, string>();
    let currentIdNum = 0;

    rows.forEach(row => {
        if (idsToResurrect.has(row.key)) {
             while (true) {
                 const candidateId = to185(currentIdNum);
                 if (!usedIds.has(candidateId)) {
                     localIdMap.set(row.key, candidateId);
                     usedIds.add(candidateId);
                     currentIdNum++; 
                     break;
                 }
                 currentIdNum++;
             }
        }
    });

    rows.forEach(row => {
        if (row.action === 'DELETE') return;

        let taskToUse: Task | undefined;

        // 特殊処理: 復活対象として選択された行 (Local優先 + Remote追加)
        if (idsToResurrect.has(row.key) && row.local && row.remote) {
            // A. リモートタスク (元のIDを使用)
            // リネームは「リモート側」に適用する
            const rTask = { ...row.remote };
            if (renames.has(row.key)) {
                rTask.name = renames.get(row.key)!;
            }
            finalTasks.push(rTask);
            
            // B. ローカルタスク (新しいIDを使用)
            // ローカル側はIDのみ変更し、名前は変更しない（重複を避けるためユーザーがリネームしたのはリモート側とみなす）
            const lTask = { ...row.local };
            lTask.id = localIdMap.get(row.key)!;
            
            if (lTask.parentId && localIdMap.has(lTask.parentId)) {
                lTask.parentId = localIdMap.get(lTask.parentId);
            }
            finalTasks.push(lTask);
            
            return;
        }

        // 通常処理
        if (row.action === 'USE_LOCAL' && row.local) {
            taskToUse = { ...row.local };
            // 親が移動している場合への追従
            if (taskToUse.parentId && localIdMap.has(taskToUse.parentId)) {
                taskToUse.parentId = localIdMap.get(taskToUse.parentId);
            }
        } else if (row.action === 'USE_REMOTE' && row.remote) {
            taskToUse = { ...row.remote };
        } else if (row.action === 'ADD_REMOTE' && row.remote) {
            taskToUse = { ...row.remote };
        }

        if (taskToUse) {
            // リネームの適用
            if (renames.has(row.key)) {
                taskToUse.name = renames.get(row.key)!;
            }
            finalTasks.push(taskToUse);
        }
    });

    // 2. 親子関係の整合性チェック
    const finalIds = new Set(finalTasks.map(t => t.id));
    finalTasks.forEach(t => {
        if (t.parentId && !finalIds.has(t.parentId)) {
            t.parentId = undefined;
        }
    });

    // 同一階層での名前重複チェック（最終確認）
    // finalizeMerge前の handleInitialMerge でもチェックしているが、
    // 追加タスク選択(IGNORED_SELECT)を経由した場合のためにここでもチェック
    // ただし、復活機能でタスクが増える場合、ここで名前が重複する可能性があるため、
    // 本当は復活タスクの名前も個別に設定できるのがベストだが、今回は簡易的に
    // 「復活するローカルタスクは元の名前」「リモートタスクはリネーム後の名前」としている。
    // もしこれらが重複したらアラートを出す。
    const seen = new Set<string>();
    const duplicateNames = new Set<string>();

    finalTasks.forEach(t => {
        const key = `${t.parentId || 'root'}:${t.name}`;
        if (seen.has(key)) {
            duplicateNames.add(t.name);
        }
        seen.add(key);
    });

    if (duplicateNames.size > 0) {
        alert(`以下のタスク名が同じ階層で重複しています。\nマージするには名前を変更してください。\n\n${Array.from(duplicateNames).join('\n')}`);
        return;
    }

    onConfirm({ 
        id: localData.id, 
        projectName: projectNameChoice === 'LOCAL' ? localData.projectName : incomingData.projectName, 
        projectStartDate: localData.projectStartDate, 
        tasks: finalTasks, 
        lastSynced: Date.now() 
    });
  };

  const toggleIgnoredSelection = (id: string) => {
    const newSet = new Set(selectedIgnoredIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIgnoredIds(newSet);
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

  if (step === 'IGNORED_SELECT') {
    const conflictRows = rows.filter(r => ignoredIds.has(r.key));
    return (
        <div style={overlayStyle}>
            <div style={{ ...modalStyle, width: '600px', maxWidth: '90vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ marginTop: 0 }}>競合タスクの追加確認</h3>
                <p style={{ fontSize: '0.9em', color: '#ccc' }}>
                    以下のリモートタスクはローカル優先でマージされましたが、別タスクとして追加することも可能です。<br/>
                    追加する場合、ローカルタスクのIDが変更され、リモートタスクが元のIDで追加されます。<br/>
                    <span style={{color: '#ff6b6b'}}>※注意: 名前が重複する場合、この後のチェックでエラーになります。</span>
                </p>
                <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #444', borderRadius: '4px', margin: '10px 0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
                        <thead>
                            <tr style={{ background: '#333', textAlign: 'left' }}>
                                <th style={{ padding: '8px', width: '30px' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={selectedIgnoredIds.size === ignoredIds.size && ignoredIds.size > 0}
                                        onChange={(e) => setSelectedIgnoredIds(e.target.checked ? new Set(ignoredIds) : new Set())}
                                    />
                                </th>
                                <th style={{ padding: '8px' }}>リモートタスク名 (追加対象)</th>
                                <th style={{ padding: '8px', color: '#888' }}>ローカル (ID変更)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {conflictRows.map(row => (
                                <tr key={row.key} style={{ borderBottom: '1px solid #444' }}>
                                    <td style={{ padding: '8px', textAlign: 'center' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedIgnoredIds.has(row.key)}
                                            onChange={() => toggleIgnoredSelection(row.key)}
                                        />
                                    </td>
                                    <td style={{ padding: '8px' }}>{row.remote?.name}</td>
                                    <td style={{ padding: '8px', color: '#888' }}>{row.local?.name}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                    <button onClick={() => setStep('TASKS')} style={{ ...btnStyle, backgroundColor: '#555' }}>戻る</button>
                    <button onClick={() => finalizeMerge(selectedIgnoredIds)} style={{ ...btnStyle, backgroundColor: '#007bff' }}>
                        決定してマージ
                    </button>
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
                    <button onClick={handleInitialMerge} style={{ ...btnStyle, backgroundColor: '#28a745', border: 'none' }}>実行</button>
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
                                
                                const currentName = renames.get(row.key) || (row.local ? row.local.name : row.remote ? row.remote.name : '');
                                const isRenamed = renames.has(row.key);
                                const isDuplicated = duplicateKeys.has(row.key);

                                return (
                                    <tr key={row.key} style={{ borderBottom: '1px solid #333' }}>
                                        {/* Local Column */}
                                        <td style={{ padding: '8px', paddingLeft: `${8 + row.depth * 24}px`, color: row.local ? `rgba(255,255,255,${rowOpacity})` : '#666' }}>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                {row.depth > 0 && <span style={{ marginRight: '6px', color: '#555' }}>└</span>}
                                                {row.local ? (
                                                    <div style={{ display: 'flex', alignItems: 'flex-start', flex: 1 }}>
                                                        <StatusBadge status={row.local.status} />
                                                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                                            {/* 重複警告表示 */}
                                                            {isDuplicated && row.local && (
                                                                <div style={{ color: '#ff6b6b', fontSize: '0.75em', marginBottom: '2px' }}>
                                                                    ⚠️ 名前重複
                                                                </div>
                                                            )}
                                                            {editingId === row.key && row.local ? (
                                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                                    <input autoFocus value={tempName} onChange={(e) => setTempName(e.target.value)} style={{ padding: '2px', background: '#444', color: '#fff', border: '1px solid #666' }} />
                                                                    <button onClick={handleSaveRename} style={{ padding: '0 4px', fontSize: '0.8em', background: '#007bff' }}>OK</button>
                                                                    <button onClick={handleCancelRename} style={{ padding: '0 4px', fontSize: '0.8em', background: '#555' }}>✕</button>
                                                                </div>
                                                            ) : (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <span style={{ color: isRenamed ? '#ffeb3b' : 'inherit' }}>{isRenamed ? currentName : breakText(row.local.name)}</span>
                                                                    <button onClick={() => handleStartRename(row.key, row.local!.name)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#646cff', padding: 0 }} title="名前を変更">✎</button>
                                                                </div>
                                                            )}
                                                            {localDate && <span style={{ fontSize: '0.85em', color: '#aaa' }}>({localDate})</span>}
                                                            <span style={{fontSize: '0.7em', color:'#555'}}>{row.key}</span>
                                                        </div>
                                                    </div>
                                                ) : '(なし)'}
                                            </div>
                                        </td>
                                        
                                        {/* Action Column */}
                                        <td style={{ padding: '8px', opacity: rowOpacity }}>{isContextRow ? <span style={{ color: '#888', fontSize: '0.85em' }}>（一致）</span> : <select value={row.action} onChange={(e) => handleRowActionChange(row.key, e.target.value as ResolveAction)} style={{ width: '100%', padding: '4px', background: '#222', color: '#fff', border: '1px solid #444' }}>{row.local && row.remote && (<><option value="USE_LOCAL">Local優先</option><option value="USE_REMOTE">Remote優先</option><option value="DELETE">削除</option></>)}{row.local && !row.remote && (<><option value="USE_LOCAL">Local維持</option><option value="DELETE">削除</option></>)}{!row.local && row.remote && (<><option value="ADD_REMOTE">追加</option><option value="DELETE">追加しない</option></>)}</select>}</td>
                                        
                                        {/* Remote Column */}
                                        <td style={{ padding: '8px', paddingLeft: `${8 + row.depth * 24}px`, color: row.remote ? `rgba(255,255,255,${rowOpacity})` : '#666' }}>
                                            {row.remote && (
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                                        {row.depth > 0 && <span style={{ marginRight: '6px', color: '#555' }}>└</span>}
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', flex: 1 }}>
                                                            <StatusBadge status={row.remote.status} />
                                                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                                                {/* 重複警告表示 (Remote側) */}
                                                                {isDuplicated && !row.local && (
                                                                    <div style={{ color: '#ff6b6b', fontSize: '0.75em', marginBottom: '2px' }}>
                                                                        ⚠️ 名前重複
                                                                    </div>
                                                                )}
                                                                {editingId === row.key && !row.local ? (
                                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                                        <input autoFocus value={tempName} onChange={(e) => setTempName(e.target.value)} style={{ padding: '2px', background: '#444', color: '#fff', border: '1px solid #666' }} />
                                                                        <button onClick={handleSaveRename} style={{ padding: '0 4px', fontSize: '0.8em', background: '#007bff' }}>OK</button>
                                                                        <button onClick={handleCancelRename} style={{ padding: '0 4px', fontSize: '0.8em', background: '#555' }}>✕</button>
                                                                    </div>
                                                                ) : (
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                        <span style={{ color: isRenamed ? '#ffeb3b' : 'inherit' }}>{isRenamed ? currentName : breakText(row.remote.name)}</span>
                                                                        {/* Localがない場合のみこちらでリネーム可能にする */}
                                                                        {!row.local && (
                                                                            <button onClick={() => handleStartRename(row.key, row.remote!.name)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#646cff', padding: 0 }} title="名前を変更">✎</button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                {remoteDate && <span style={{ fontSize: '0.85em', color: '#aaa' }}>({remoteDate})</span>}
                                                                <span style={{fontSize: '0.7em', color:'#555'}}>{row.key}</span>
                                                            </div>
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

const overlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 };
const modalStyle: React.CSSProperties = { backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '8px', color: '#fff', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' };
const btnStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: '#fff', cursor: 'pointer' };