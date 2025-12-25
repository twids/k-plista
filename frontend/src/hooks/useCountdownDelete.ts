import { useState, useEffect, useRef, useCallback } from 'react';
import type { CountdownDeleteItem } from '../types';

interface UseCountdownDeleteReturn {
  deletingItems: CountdownDeleteItem[];
  initiateDelete: (itemId: string, message: string) => void;
  cancelDelete: (itemId: string) => void;
}

const COUNTDOWN_SECONDS = 5;

export const useCountdownDelete = (
  onDelete: (itemId: string) => Promise<void> | void
): UseCountdownDeleteReturn => {
  const [deletingItems, setDeletingItems] = useState<CountdownDeleteItem[]>([]);

  // Store timers per item
  const timersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const deleteTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Cleanup function to clear timers for a specific item
  const cleanupItem = useCallback((itemId: string) => {
    const timer = timersRef.current.get(itemId);
    if (timer) {
      clearInterval(timer);
      timersRef.current.delete(itemId);
    }
    const timeout = deleteTimeoutsRef.current.get(itemId);
    if (timeout) {
      clearTimeout(timeout);
      deleteTimeoutsRef.current.delete(itemId);
    }
  }, []);

  // Cleanup all timers
  const cleanupAll = useCallback(() => {
    timersRef.current.forEach((timer) => clearInterval(timer));
    deleteTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    timersRef.current.clear();
    deleteTimeoutsRef.current.clear();
  }, []);

  // Cancel the delete operation for a specific item
  const cancelDelete = useCallback((itemId: string) => {
    cleanupItem(itemId);
    setDeletingItems((prev) => prev.filter((item) => item.itemId !== itemId));
  }, [cleanupItem]);

  // Initiate delete with countdown
  const initiateDelete = useCallback((itemId: string, message: string) => {
    // Cancel if this item is already being deleted
    cleanupItem(itemId);

    // Add item to deletion queue
    setDeletingItems((prev) => {
      // Remove if already exists, then add with fresh countdown
      const filtered = prev.filter((item) => item.itemId !== itemId);
      return [...filtered, { itemId, countdown: COUNTDOWN_SECONDS, message }];
    });

    const startTime = Date.now();
    const endTime = startTime + COUNTDOWN_SECONDS * 1000;

    // Update countdown display frequently for responsive UI
    const timer = setInterval(() => {
      const now = Date.now();
      const remaining = Math.ceil((endTime - now) / 1000);
      
      if (remaining >= 0) {
        setDeletingItems((prev) =>
          prev.map((item) =>
            item.itemId === itemId ? { ...item, countdown: remaining } : item
          )
        );
      }
      
      if (remaining <= 0) {
        const currentTimer = timersRef.current.get(itemId);
        if (currentTimer) {
          clearInterval(currentTimer);
          timersRef.current.delete(itemId);
        }
      }
    }, 200); // Update every 200ms for responsive feel while avoiding excessive renders

    timersRef.current.set(itemId, timer);

    // Set timeout to execute delete - this is the authoritative timer
    const deleteTimeout = setTimeout(async () => {
      cleanupItem(itemId);
      
      try {
        await onDelete(itemId);
        // Remove item from deletion queue after successful deletion
        setDeletingItems((prev) => prev.filter((item) => item.itemId !== itemId));
      } catch (error) {
        console.error('Delete operation failed:', error);
        // Remove item from deletion queue even on error
        setDeletingItems((prev) => prev.filter((item) => item.itemId !== itemId));
      }
    }, COUNTDOWN_SECONDS * 1000);

    deleteTimeoutsRef.current.set(itemId, deleteTimeout);
  }, [cleanupItem, onDelete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAll();
    };
  }, [cleanupAll]);

  return {
    deletingItems,
    initiateDelete,
    cancelDelete,
  };
};
