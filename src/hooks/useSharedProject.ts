import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import type { AppData } from '../types';

export const useSharedProject = (
  setData: (data: AppData) => void,
  switchProject: (id: string) => void
) => {
  const { getToken, isLoaded } = useAuth();
  const [isCheckingShared, setIsCheckingShared] = useState(false);
  const [sharedRole, setSharedRole] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    const checkSharedProject = async () => {
      const path = window.location.pathname;
      const pathParts = path.split('/').filter(Boolean);
      
      // パスが1つ（例: /short_id/）の場合を共有リンクへのアクセスとみなす
      if (pathParts.length === 1) {
        const shortId = pathParts[0];
        // dataパラメータ（'d'）がある場合は共有URL生成による遷移なのでスキップ
        const params = new URLSearchParams(window.location.search);
        if (params.has('d')) return;

        setIsCheckingShared(true);
        
        try {
          const token = await getToken();
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch(`http://localhost:5174/api/projects/shared/${shortId}`, {
            method: 'GET',
            headers
          });

          const result = await response.json();

          if (!response.ok || !result.success) {
            // 観ることができない（権限がない、非公開設定、存在しない）場合
            alert('権限がありません。');
            window.location.href = '/'; 
          } else {
            // APIから返ってきたプロジェクト情報をセット
            const projectData = result.project;
            const sharedData: AppData = {
              id: projectData.id,
              shortId: shortId,
              projectName: projectData.projectName,
              tasks: projectData.data?.tasks || [],
              lastSynced: Date.now(),
              isCloudSync: true,
              isPublic: projectData.isPublic,
              publicRole: projectData.publicRole || result.role,
            };

            setData(sharedData);
            switchProject(sharedData.id);
            setSharedRole(result.role);
          }
        } catch (error) {
          console.error("共有プロジェクトの取得に失敗しました", error);
          alert('読み込みに失敗しました。');
          window.location.href = '/';
        } finally {
          setIsCheckingShared(false);
        }
      }
    };

    checkSharedProject();
  }, [isLoaded, getToken, setData, switchProject]);

  return { isCheckingShared, sharedRole };
};