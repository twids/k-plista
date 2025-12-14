import React, { createContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { HubConnectionState } from '@microsoft/signalr';
import signalRService from '../services/signalRService';
import { useAuth } from '../hooks/useAuth';

interface SignalRContextType {
  connectionState: HubConnectionState | null;
  isConnected: boolean;
  joinList: (listId: string) => Promise<void>;
  leaveList: (listId: string) => Promise<void>;
}

const SignalRContext = createContext<SignalRContextType | undefined>(undefined);

// Export the context for use in the hook
export { SignalRContext };

interface SignalRProviderProps {
  children: ReactNode;
}

export const SignalRProvider: React.FC<SignalRProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [connectionState, setConnectionState] = useState<HubConnectionState | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (user) {
      // Connect to SignalR when user is authenticated
      // Token is stored in secure HTTP-only cookie; no need to pass it explicitly
      signalRService.connect().catch(err => {
        console.error('Failed to connect to SignalR:', err);
      });

      // Subscribe to connection state changes
      const unsubscribe = signalRService.onStateChange((state) => {
        setConnectionState(state);
        setIsConnected(state === HubConnectionState.Connected);
      });

      // Set initial state
      setConnectionState(signalRService.getConnectionState());
      setIsConnected(signalRService.isConnected());

      return () => {
        unsubscribe();
        // Disconnect when component unmounts or user logs out
        signalRService.disconnect();
      };
    } else {
      // Disconnect if user is not authenticated
      signalRService.disconnect();
      setConnectionState(null);
      setIsConnected(false);
    }
  }, [user]);

  const joinList = async (listId: string) => {
    await signalRService.joinList(listId);
  };

  const leaveList = async (listId: string) => {
    await signalRService.leaveList(listId);
  };

  const value: SignalRContextType = {
    connectionState,
    isConnected,
    joinList,
    leaveList,
  };

  return (
    <SignalRContext.Provider value={value}>
      {children}
    </SignalRContext.Provider>
  );
};
