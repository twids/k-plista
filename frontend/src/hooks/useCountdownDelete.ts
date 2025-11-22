import { useState, useEffect, useRef, useCallback } from 'react';

interface CountdownDeleteState {
  isCountingDown: boolean;
  countdown: number;
  itemId: string | null;
  message: string;
}

interface UseCountdownDeleteReturn {
  countdownState: CountdownDeleteState;
  initiateDelete: (itemId: string, message: string) => void;
  cancelDelete: () => void;
}

const COUNTDOWN_SECONDS = 5;

export const useCountdownDelete = (
  onDelete: (itemId: string) => Promise<void> | void
): UseCountdownDeleteReturn => {
  const [countdownState, setCountdownState] = useState<CountdownDeleteState>({
    isCountingDown: false,
    countdown: COUNTDOWN_SECONDS,
    itemId: null,
    message: '',
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup function to clear all timers
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (deleteTimeoutRef.current) {
      clearTimeout(deleteTimeoutRef.current);
      deleteTimeoutRef.current = null;
    }
  }, []);

  // Cancel the delete operation
  const cancelDelete = useCallback(() => {
    cleanup();
    setCountdownState({
      isCountingDown: false,
      countdown: COUNTDOWN_SECONDS,
      itemId: null,
      message: '',
    });
  }, [cleanup]);

  // Initiate delete with countdown
  const initiateDelete = useCallback((itemId: string, message: string) => {
    // Cancel any existing countdown
    cleanup();

    // Set initial state
    setCountdownState({
      isCountingDown: true,
      countdown: COUNTDOWN_SECONDS,
      itemId,
      message,
    });

    const startTime = Date.now();
    const endTime = startTime + COUNTDOWN_SECONDS * 1000;

    // Update countdown display every second
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const remaining = Math.ceil((endTime - now) / 1000);
      
      if (remaining >= 0) {
        setCountdownState((prev) => ({
          ...prev,
          countdown: remaining,
        }));
      }
      
      if (remaining <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    }, 100); // Check more frequently for smoother updates

    // Set timeout to execute delete - this is the authoritative timer
    deleteTimeoutRef.current = setTimeout(async () => {
      cleanup();
      
      try {
        await onDelete(itemId);
        // Only reset state after successful deletion
        setCountdownState({
          isCountingDown: false,
          countdown: COUNTDOWN_SECONDS,
          itemId: null,
          message: '',
        });
      } catch (error) {
        console.error('Delete operation failed:', error);
        // Reset state even on error, but error is logged
        setCountdownState({
          isCountingDown: false,
          countdown: COUNTDOWN_SECONDS,
          itemId: null,
          message: '',
        });
      }
    }, COUNTDOWN_SECONDS * 1000);
  }, [cleanup, onDelete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    countdownState,
    initiateDelete,
    cancelDelete,
  };
};
