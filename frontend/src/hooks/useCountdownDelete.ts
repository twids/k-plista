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

    let remainingTime = COUNTDOWN_SECONDS;

    // Start countdown timer
    timerRef.current = setInterval(() => {
      remainingTime -= 1;
      setCountdownState((prev) => ({
        ...prev,
        countdown: remainingTime,
      }));

      if (remainingTime <= 0) {
        cleanup();
      }
    }, 1000);

    // Set timeout to execute delete
    deleteTimeoutRef.current = setTimeout(async () => {
      cleanup();
      setCountdownState({
        isCountingDown: false,
        countdown: COUNTDOWN_SECONDS,
        itemId: null,
        message: '',
      });
      
      try {
        await onDelete(itemId);
      } catch (error) {
        console.error('Delete operation failed:', error);
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
