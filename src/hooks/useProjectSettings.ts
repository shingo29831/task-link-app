// 役割: プロジェクト名、同期、公開範囲、メンバー権限などの設定変更API通信を管理する
// なぜ: プロジェクト単位の設定ロジックをタスク操作から分離し、保守性を高めるため

import { useEffect, useRef, useState, useCallback } from 'react';
import type { AppData, UserRole } from '../types';

export const useProjectSettings = (
  data: AppData | null,
  setData: (data: AppData) => void,
  getToken: () => Promise<string | null>,
  uploadProject: (id: string) => void,
  projectsRef: React.MutableRefObject<AppData[]>,
  showSettingsModal: boolean
) => {
  const [retryFetchTrigger, setRetryFetchTrigger] = useState(0);
  const fetchMembersRef = useRef<string | null>(null);
  const fetchMembersTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (showSettingsModal && data && !String(data.id).startsWith('local_') && data.isCloudSync !== false) {
        if (fetchMembersRef.current === data.id) return;
        fetchMembersRef.current = data.id;

        const fetchMembers = async () => {
            try {
                const token = await getToken();
                const res = await fetch(`/api/projects/${data.id}/members`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const resData = await res.json();
                    const currentData = projectsRef.current.find(p => p.id === data.id);
                    if (currentData) {
                        setData({ 
                           ...currentData, 
                           members: resData.members, 
                           isPublic: resData.isPublic, 
                           publicRole: resData.publicRole 
                        });
                    }
                } else {
                    throw new Error('Failed to fetch members');
                }
            } catch (e) { 
                console.error("メンバー情報の取得に失敗しました:", e); 
                fetchMembersTimeoutRef.current = setTimeout(() => {
                    fetchMembersRef.current = null;
                    setRetryFetchTrigger(prev => prev + 1);
                }, 10000);
            }
        };
        fetchMembers();
    } else if (!showSettingsModal) {
        fetchMembersRef.current = null;
        if (fetchMembersTimeoutRef.current) {
            clearTimeout(fetchMembersTimeoutRef.current);
            fetchMembersTimeoutRef.current = null;
        }
    }
  }, [showSettingsModal, data?.id, data?.isCloudSync, getToken, setData, retryFetchTrigger, projectsRef]);

  const handleUpdateProjectName = useCallback(async (newName: string) => {
    if (!data) return;
    setData({ ...data, projectName: newName, lastSynced: Date.now() });

    if (!String(data.id).startsWith('local_') && data.isCloudSync !== false) {
        try {
            const token = await getToken();
            const res = await fetch(`/api/projects/${data.id}/name`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectName: newName })
            });
            if (!res.ok) alert("プロジェクト名のクラウド更新に失敗しました");
        } catch (e) {
            console.error(e);
            alert("プロジェクト名のクラウド更新に失敗しました");
        }
    }
  }, [data, setData, getToken]);

  const handleToggleSync = useCallback(async (enabled: boolean) => {
      if (!data) return;
      if (enabled) {
          uploadProject(data.id);
      } else {
           if (!confirm("クラウド同期をオフにすると、クラウド上のデータは削除されローカルのみの保存になります。よろしいですか？")) return;
           try {
               const token = await getToken();
               await fetch(`/api/projects/${data.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
               setData({ ...data, isCloudSync: false, shortId: undefined });
           } catch (e) {
               console.error(e);
               alert("同期のオフに失敗しました");
           }
      }
  }, [data, uploadProject, getToken, setData]);

  const handleTogglePublic = useCallback(async (isPublic: boolean) => {
      if (!data || String(data.id).startsWith('local_')) return;
      try {
          const token = await getToken();
          const res = await fetch(`/api/projects/${data.id}/public`, {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ isPublic })
          });
          if (res.ok) setData({ ...data, isPublic, lastSynced: Date.now() });
          else alert("公開設定の変更に失敗しました");
      } catch (e) {
          console.error(e);
          alert("公開設定の変更に失敗しました");
      }
  }, [data, getToken, setData]);

  const handleInviteUser = useCallback(async (username: string) => {
      if (!data || String(data.id).startsWith('local_')) return;
      try {
          const token = await getToken();
          const res = await fetch(`/api/projects/${data.id}/members`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, role: 'viewer' })
          });
          if (res.ok) {
              const resData = await res.json();
              if (resData.member) {
                  setData({ ...data, members: [...(data.members || []), resData.member], lastSynced: Date.now() });
                  alert(`${username} を招待しました。`);
              }
          } else {
              const errorData = await res.json();
              alert(`招待に失敗しました: ${errorData.error}`);
          }
      } catch (e) {
          console.error(e);
          alert("招待に失敗しました");
      }
  }, [data, getToken, setData]);

  const handleChangeRole = useCallback(async (memberId: string, newRole: UserRole) => {
      if (!data || String(data.id).startsWith('local_')) return;
      try {
          const token = await getToken();
          const res = await fetch(`/api/projects/${data.id}/members/${memberId}`, {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ role: newRole })
          });
          if (res.ok) {
              const newMembers = (data.members || []).map(m => m.id === memberId ? { ...m, role: newRole } : m);
              setData({ ...data, members: newMembers, lastSynced: Date.now() });
          } else alert("権限の変更に失敗しました");
      } catch (e) {
          console.error(e);
          alert("権限の変更に失敗しました");
      }
  }, [data, getToken, setData]);

  const handleRemoveMember = useCallback(async (memberId: string) => {
      if (!data || String(data.id).startsWith('local_')) return;
      if (!confirm("このメンバーを削除しますか？")) return;
      try {
          const token = await getToken();
          const res = await fetch(`/api/projects/${data.id}/members/${memberId}`, {
              method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
              const newMembers = (data.members || []).filter(m => m.id !== memberId);
              setData({ ...data, members: newMembers, lastSynced: Date.now() });
          } else alert("メンバーの削除に失敗しました");
      } catch (e) {
          console.error(e);
          alert("メンバーの削除に失敗しました");
      }
  }, [data, getToken, setData]);

  return { handleUpdateProjectName, handleToggleSync, handleTogglePublic, handleInviteUser, handleChangeRole, handleRemoveMember };
};