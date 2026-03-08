// src/hooks/useSharedProject.ts
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
      
      // なぜ: /shortId だけでなく /shortId/snapshot のパスパターンも許容し、正しくshortIdを抽出するため
      if (pathParts.length === 1 || (pathParts.length === 2 && pathParts[1] === 'snapshot')) {
        const shortId = pathParts[0];

        hasCheckedRef.current = true;

        try {
          if (document.referrer) {
            const referrerUrl = new URL(document.referrer);
            const referrerPathParts = referrerUrl.pathname.split('/').filter(Boolean);
            if (referrerPathParts.length >= 1 && referrerPathParts[0] === shortId) {
              console.log(`[useSharedProject] Referrer matches shortId: ${shortId}. Skipping modal.`);
              return;
            }
          }
        } catch (e) {
          console.warn("[useSharedProject] Referrer URL parse error", e);
        }

        console.log(`[useSharedProject] Start checking shared project for shortId: ${shortId}`);
        setIsCheckingShared(true);
        
        try {
          const token = await getToken();
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch(`/api/projects/shared/${shortId}`, {
            method: 'GET',
            headers
          });

          const result = await response.json();
          console.log(`[useSharedProject] API Response:`, result);

          const params = new URLSearchParams(window.location.search);
          const compressed = params.get('d');

          if (!response.ok || !result.success) {
            console.warn(`[useSharedProject] Access denied or error:`, result?.error);
            setSharedProjectState({
              shortId,
              projectData: null,
              role: 'none',
              compressedData: compressed
            });
          } else {
            console.log(`[useSharedProject] Access granted. Assigned Role:`, result.role);
            const projectData = result.project;
            const role = result.role; 
            
            if (compressed) {
               console.log(`[useSharedProject] Found compressed link data '?d='`);
            }

            setSharedProjectState({
              shortId,
              projectData,
              role,
              compressedData: compressed
            });
          }
        } catch (error) {
          console.error("[useSharedProject] Failed to fetch shared project:", error);
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