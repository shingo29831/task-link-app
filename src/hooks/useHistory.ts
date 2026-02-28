import { useState, useCallback } from 'react';

// 履歴の最大保持数
const HISTORY_LIMIT = 50;

export function useHistory<T>(initialState: T, transformUndoRedo?: (curr: T, next: T) => T) {
  const [history, setHistory] = useState<{
    past: T[];
    present: T;
    future: T[];
  }>({
    past: [],
    present: initialState,
    future: [],
  });

  // 履歴を残して状態を更新
  const setState = useCallback((newState: T | ((prev: T) => T)) => {
    setHistory(curr => {
      const nextPresent = typeof newState === 'function' 
        ? (newState as (prev: T) => T)(curr.present) 
        : newState;
      
      if (curr.present === nextPresent) return curr;

      const newPast = [...curr.past, curr.present];
      // 最大件数を超えたら古い履歴を捨てる
      if (newPast.length > HISTORY_LIMIT) {
        newPast.shift();
      }

      return {
        past: newPast,
        present: nextPresent,
        future: [], // 新しい操作をしたらRedo履歴はクリア
      };
    });
  }, []);

  // 履歴を残さずに状態を初期化/リセット（ロード時など）
  const resetState = useCallback((newState: T) => {
    setHistory({
      past: [],
      present: newState,
      future: [],
    });
  }, []);

  // 履歴全体を外部から直接改変・マージするための関数（クラウド同期用）
  const modifyHistory = useCallback((modifier: (curr: { past: T[]; present: T; future: T[] }) => { past: T[]; present: T; future: T[] }) => {
    setHistory(curr => modifier(curr));
  }, []);

  // 元に戻す (Undo)
  const undo = useCallback(() => {
    setHistory(curr => {
      if (curr.past.length === 0) return curr;

      const previous = curr.past[curr.past.length - 1];
      const newPast = curr.past.slice(0, curr.past.length - 1);

      const nextPresent = transformUndoRedo ? transformUndoRedo(curr.present, previous) : previous;

      return {
        past: newPast,
        present: nextPresent,
        future: [curr.present, ...curr.future],
      };
    });
  }, [transformUndoRedo]);

  // やり直す (Redo) - 必要であれば
  const redo = useCallback(() => {
    setHistory(curr => {
      if (curr.future.length === 0) return curr;

      const next = curr.future[0];
      const newFuture = curr.future.slice(1);

      const nextPresent = transformUndoRedo ? transformUndoRedo(curr.present, next) : next;

      return {
        past: [...curr.past, curr.present],
        present: nextPresent,
        future: newFuture,
      };
    });
  }, [transformUndoRedo]);

  return {
    state: history.present,
    setState,
    resetState,
    modifyHistory, // ★追加
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0
  };
}