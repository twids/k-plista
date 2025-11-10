import * as signalR from '@microsoft/signalr';
import type { GroceryItem, ActiveUser, ItemBoughtStatusUpdate, ItemRemovedUpdate } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const HUB_URL = API_URL.replace('/api', '/hubs/list');

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private currentListId: string | null = null;
  private stateChangeCallbacks: Array<(state: signalR.HubConnectionState) => void> = [];

  async connect(token: string): Promise<void> {
    if (this.connection) {
      return;
    }

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: () => token,
        withCredentials: true,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: retryContext => {
          // Custom retry logic: exponential backoff with max delay
          if (retryContext.previousRetryCount === 0) {
            return 0;
          }
          if (retryContext.previousRetryCount < 5) {
            return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
          }
          return 30000; // max 30 seconds
        }
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.connection.onreconnecting(() => {
      console.log('SignalR reconnecting...');
      this.notifyStateChange(signalR.HubConnectionState.Reconnecting);
    });

    this.connection.onreconnected(() => {
      console.log('SignalR reconnected');
      this.notifyStateChange(signalR.HubConnectionState.Connected);
      // Rejoin the current list if we were in one
      if (this.currentListId) {
        this.joinList(this.currentListId);
      }
    });

    this.connection.onclose(() => {
      console.log('SignalR connection closed');
      this.notifyStateChange(signalR.HubConnectionState.Disconnected);
      this.connection = null;
    });

    try {
      await this.connection.start();
      console.log('SignalR connected');
      this.notifyStateChange(signalR.HubConnectionState.Connected);
    } catch (err) {
      console.error('SignalR connection error:', err);
      throw err;
    }
  }

  private notifyStateChange(state: signalR.HubConnectionState): void {
    this.stateChangeCallbacks.forEach(callback => callback(state));
  }

  onStateChange(callback: (state: signalR.HubConnectionState) => void): () => void {
    this.stateChangeCallbacks.push(callback);
    // Return cleanup function
    return () => {
      this.stateChangeCallbacks = this.stateChangeCallbacks.filter(cb => cb !== callback);
    };
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      if (this.currentListId) {
        await this.leaveList(this.currentListId);
      }
      await this.connection.stop();
      this.connection = null;
      this.currentListId = null;
    }
  }

  async joinList(listId: string): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error('SignalR connection not established');
    }

    try {
      await this.connection.invoke('JoinList', listId);
      this.currentListId = listId;
      console.log(`Joined list: ${listId}`);
    } catch (err) {
      console.error('Error joining list:', err);
      throw err;
    }
  }

  async leaveList(listId: string): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      return;
    }

    try {
      await this.connection.invoke('LeaveList', listId);
      this.currentListId = null;
      console.log(`Left list: ${listId}`);
    } catch (err) {
      console.error('Error leaving list:', err);
    }
  }

  onItemAdded(callback: (item: GroceryItem) => void): void {
    this.connection?.on('ItemAdded', callback);
  }

  offItemAdded(callback: (item: GroceryItem) => void): void {
    this.connection?.off('ItemAdded', callback);
  }

  onItemUpdated(callback: (item: GroceryItem) => void): void {
    this.connection?.on('ItemUpdated', callback);
  }

  offItemUpdated(callback: (item: GroceryItem) => void): void {
    this.connection?.off('ItemUpdated', callback);
  }

  onItemBoughtStatusChanged(callback: (data: ItemBoughtStatusUpdate) => void): void {
    this.connection?.on('ItemBoughtStatusChanged', callback);
  }

  offItemBoughtStatusChanged(callback: (data: ItemBoughtStatusUpdate) => void): void {
    this.connection?.off('ItemBoughtStatusChanged', callback);
  }

  onItemRemoved(callback: (data: ItemRemovedUpdate) => void): void {
    this.connection?.on('ItemRemoved', callback);
  }

  offItemRemoved(callback: (data: ItemRemovedUpdate) => void): void {
    this.connection?.off('ItemRemoved', callback);
  }

  onUserJoined(callback: (user: ActiveUser) => void): void {
    this.connection?.on('UserJoined', callback);
  }

  offUserJoined(callback: (user: ActiveUser) => void): void {
    this.connection?.off('UserJoined', callback);
  }

  onUserLeft(callback: (user: ActiveUser) => void): void {
    this.connection?.on('UserLeft', callback);
  }

  offUserLeft(callback: (user: ActiveUser) => void): void {
    this.connection?.off('UserLeft', callback);
  }

  onActiveUsers(callback: (users: ActiveUser[]) => void): void {
    this.connection?.on('ActiveUsers', callback);
  }

  offActiveUsers(callback: (users: ActiveUser[]) => void): void {
    this.connection?.off('ActiveUsers', callback);
  }

  getConnectionState(): signalR.HubConnectionState | null {
    return this.connection?.state ?? null;
  }

  isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }
}

// Export a singleton instance
export const signalRService = new SignalRService();
export default signalRService;
