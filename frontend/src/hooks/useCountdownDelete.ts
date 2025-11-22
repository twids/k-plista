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

    let remainingTime = COUNTDOWN_SECONDS - 1;

    // Start countdown timer - update display every second
    timerRef.current = setInterval(() => {
      if (remainingTime > 0) {
        setCountdownState((prev) => ({
          ...prev,
          countdown: remainingTime,
        }));
        remainingTime -= 1;
      } else {
        // Countdown reached 0, clear the interval
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    }, 1000);

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
