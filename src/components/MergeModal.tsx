import React, { useState, useEffect } from 'react';
import type { AppData, Task } from '../types';

interface Props {
  localData: AppData;
  incomingData: AppData;
  onConfirm: (merged: AppData) => void;
  onCancel: () => void;
}

type MergeMode = 'ID' | 'NAME';
type ResolveAction = 'USE_LOCAL' | 'USE_REMOTE' | 'DELETE' | 'ADD_REMOTE';

interface ComparisonRow {
  key: string; // ID or Name
  local?: Task;
  remote?: Task;
  action: ResolveAction;
  displayName: string;
}

export const MergeModal: React.FC<Props> = ({ localData, incomingData, onConfirm, onCancel }) => {
  const [step, setStep] = useState<'PROJECT' | 'TASKS'>(
    localData.projectName !== incomingData.projectName ? 'PROJECT' : 'TASKS'
  );
  const [projectNameChoice, setProjectNameChoice] = useState<'LOCAL' | 'REMOTE'>('LOCAL');
  const [mergeMode, setMergeMode] = useState<MergeMode>('NAME'); // Recommended default
  const [rows, setRows] = useState<ComparisonRow[]>([]);

  // Helper to display parent name
  const getDisplayName = (t: Task, all: Task[]) => {
    if (!t.parentId) return t.name;
    const p = all.find(x => x.id === t.parentId);
    return p ? `${p.name} > ${t.name}` : t.name;
  };

  useEffect(() => {
    const newRows: ComparisonRow[] = [];
    if (mergeMode === 'ID') {
      const allIds = new Set([...localData.tasks.map(t => t.id), ...incomingData.tasks.map(t => t.id)]);
      const localMap = new Map(localData.tasks.map(t => [t.id, t]));
      const remoteMap = new Map(incomingData.tasks.map(t => [t.id, t]));

      allIds.forEach(id => {
        const local = localMap.get(id);
        const remote = remoteMap.get(id);
        let action: ResolveAction = 'USE_LOCAL';
        if (!local && remote) action = 'ADD_REMOTE';
        else if (local && remote) action = 'USE_LOCAL'; // Default conflict resolution
        else if (local && !remote) action = 'USE_LOCAL';

        newRows.push({
          key: id,
          local,
          remote,
          action,
          displayName: local ? getDisplayName(local, localData.tasks) : (remote ? getDisplayName(remote, incomingData.tasks) : id)
        });
      });
    } else {
      // NAME Mode
      // Use names as keys. Simplify by handling first match only for duplicates.
      const allNames = new Set([
          ...localData.tasks.filter(t => !t.isDeleted).map(t => t.name),
          ...incomingData.tasks.filter(t => !t.isDeleted).map(t => t.name)
      ]);
      const localMap = new Map(localData.tasks.map(t => [t.name, t]));
      const remoteMap = new Map(incomingData.tasks.map(t => [t.name, t]));

      allNames.forEach(name => {
        const local = localMap.get(name);
        const remote = remoteMap.get(name);
        let action: ResolveAction = 'USE_LOCAL';
        if (!local && remote) action = 'ADD_REMOTE';
        else if (local && remote) action = 'USE_LOCAL';
        
        newRows.push({
          key: name,
          local,
          remote,
          action,
          displayName: name
        });
      });
    }
    
    // Sort rows: Local (hierarchy order) then Remote only
    // Simple sort by displayName for now
    newRows.sort((a, b) => a.displayName.localeCompare(b.displayName));
    setRows(newRows);
  }, [mergeMode, localData, incomingData]);

  const handleHeaderAction = (val: string) => {
    if (val === 'NO_MERGE') {
        // All to Keep Local (Ignore Remote)
        setRows(prev => prev.map(r => ({
            ...r,
            action: r.local ? 'USE_LOCAL' : 'DELETE' // If only remote, delete (don't add)
        })));
        return;
    }
    
    const mode = val.includes('NAME') ? 'NAME' : 'ID';
    if (mode !== mergeMode) {
        setMergeMode(mode);
        // Wait for useEffect to rebuild rows. 
        // Note: Ideally we should apply the priority AFTER rows are rebuilt, but handling that async in React requires another effect or ref.
        // For simplicity, changing mode resets actions to default (USE_LOCAL), and user can re-select priority if needed.
        return;
    }

    const priority = val.includes('REMOTE') ? 'REMOTE' : 'LOCAL';
    setRows(prev => prev.map(r => {
        if (r.local && r.remote) return { ...r, action: priority === 'REMOTE' ? 'USE_REMOTE' : 'USE_LOCAL' };
        if (!r.local && r.remote) return { ...r, action: priority === 'REMOTE' ? 'ADD_REMOTE' : 'DELETE' }; 
        return r;
    }));
  };

  const executeMerge = () => {
    const finalTasks: Task[] = [];
    const idMap = new Map<string, string>(); // OldRemoteID -> NewLocalID
    
    // Prepare ID generator
    let maxIdVal = 0;
    localData.tasks.forEach(t => {
        const v = parseInt(t.id, 36);
        if (!isNaN(v) && v > maxIdVal) maxIdVal = v;
    });
    const generateId = () => { maxIdVal++; return maxIdVal.toString(36); };

    // 1. Process tasks
    rows.forEach(row => {
        if (row.action === 'DELETE') return;

        let taskToUse: Task | undefined;
        // If USE_LOCAL, we keep local task. 
        if (row.action === 'USE_LOCAL' && row.local) {
            taskToUse = { ...row.local };
            // Map Remote ID to this Local ID if matched by name
            if (mergeMode === 'NAME' && row.remote) {
                idMap.set(row.remote.id, row.local.id);
            }
        } 
        // If USE_REMOTE (Conflict), we overwrite local with remote props but keep local ID
        else if (row.action === 'USE_REMOTE' && row.local && row.remote) {
            taskToUse = { ...row.remote, id: row.local.id }; // Keep Local ID
            idMap.set(row.remote.id, row.local.id);
        }
        // If ADD_REMOTE (Unique Remote), we add it. 
        else if (row.action === 'ADD_REMOTE' && row.remote) {
            // If ID mode, try to keep ID. If Name mode, generate new ID to avoid collision (or keep if safe).
            // For safety, generate new ID if Name mode.
            if (mergeMode === 'NAME') {
                const newId = generateId();
                taskToUse = { ...row.remote, id: newId };
                idMap.set(row.remote.id, newId);
            } else {
                // ID Mode: Keep ID (it is unique because it's in ADD_REMOTE)
                taskToUse = { ...row.remote };
            }
        }

        if (taskToUse) finalTasks.push(taskToUse);
    });

    // 2. Fix Parent IDs
    finalTasks.forEach(t => {
        if (t.parentId) {
            // If we have a mapping for the parent (it was from Remote and got mapped)
            if (idMap.has(t.parentId)) {
                t.parentId = idMap.get(t.parentId);
            } 
            // If ID matched mode, parentId stays same usually.
            // If Name matched mode and parent was Local, map might not have it if we didn't populate it for Local-only tasks.
            // But if t is from Remote, t.parentId is RemoteID. We MUST find what that RemoteID mapped to.
            // If mapped to nothing (deleted), orphan.
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
                    <select onChange={(e) => handleHeaderAction(e.target.value)} style={{ padding: '5px', borderRadius: '4px', background: '#333', color: '#fff', border: '1px solid #555' }}>
                        <option value="CUSTOM">カスタマイズ</option>
                        <option value="NO_MERGE">マージをしない</option>
                        <option value="NAME_LOCAL">マージ先(Local)優先 [タスク名]</option>
                        <option value="NAME_REMOTE">マージ元(Remote)優先 [タスク名]</option>
                        <option value="ID_LOCAL">マージ先(Local)優先 [ID]</option>
                        <option value="ID_REMOTE">マージ元(Remote)優先 [ID]</option>
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
                        {rows.map((row) => (
                            <tr key={row.key} style={{ borderBottom: '1px solid #333' }}>
                                <td style={{ padding: '8px', color: row.local ? '#fff' : '#666' }}>
                                    {row.local ? (
                                        <div title={`ID: ${row.local.id}\nStatus: ${row.local.status}`}>
                                            {row.displayName} <span style={{fontSize: '0.8em', color: '#888'}}>({row.local.status === 2 ? '完了' : '未完'})</span>
                                        </div>
                                    ) : '(なし)'}
                                </td>
                                <td style={{ padding: '8px' }}>
                                    <select 
                                        value={row.action} 
                                        onChange={(e) => {
                                            const act = e.target.value as ResolveAction;
                                            setRows(prev => prev.map(r => r.key === row.key ? { ...r, action: act } : r));
                                        }}
                                        style={{ width: '100%', padding: '4px', background: '#222', color: '#fff', border: '1px solid #444' }}
                                    >
                                        {/* Dynamic options based on availability */}
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
                                <td style={{ padding: '8px', color: row.remote ? '#fff' : '#666' }}>
                                    {row.remote ? (
                                        <div title={`ID: ${row.remote.id}\nStatus: ${row.remote.status}`}>
                                            {row.displayName} <span style={{fontSize: '0.8em', color: '#888'}}>({row.remote.status === 2 ? '完了' : '未完'})</span>
                                        </div>
                                    ) : '(なし)'}
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