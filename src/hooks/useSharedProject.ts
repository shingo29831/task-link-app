import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';

export type SharedProjectState = {
  shortId: string;
  projectData: any;
  role: string;
  compressedData: string | null;
} | null;

export const useSharedProject = () => {
  const { getToken, isLoaded } = useAuth();
  const [isCheckingShared, setIsCheckingShared] = useState(false);
  const [sharedProjectState, setSharedProjectState] = useState<SharedProjectState>(null);
  
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || hasCheckedRef.current) return;

    const checkSharedProject = async () => {
      const path = window.location.pathname;
      const pathParts = path.split('/').filter(Boolean);
      
      if (pathParts.length === 1) {
        hasCheckedRef.current = true;
        const shortId = pathParts[0];

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
            // 権限エラーや存在しないエラーはモーダルで表示させるために state にセット
            setSharedProjectState({
              shortId,
              projectData: null,
              role: 'none',
              compressedData: null
            });
          } else {
            const projectData = result.project;
            const role = result.role; 

            const params = new URLSearchParams(window.location.search);
            const compressed = params.get('d');

            // 取得成功時もモーダルに情報を渡して表示させる
            setSharedProjectState({
              shortId,
              projectData,
              role,
              compressedData: compressed
            });
          }
        } catch (error) {
          console.error("共有プロジェクトの取得に失敗しました", error);
          setSharedProjectState({
            shortId,
            projectData: null,
            role: 'error',
            compressedData: null
          });
        } finally {
          setIsCheckingShared(false);
        }
      }
    };

    checkSharedProject();
  }, [isLoaded, getToken]);

  return { isCheckingShared, sharedProjectState, setSharedProjectState };
};