import { APIRequestContext, request } from '@playwright/test';

export interface GroceryList {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  notes?: string;
  isBought: boolean;
  groupId?: string;
  groceryListId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ItemGroup {
  id: string;
  name: string;
  color?: string;
  sortOrder: number;
  groceryListId: string;
}

/**
 * API helper for grocery list operations
 */
export class ApiHelper {
  private baseURL: string;
  private apiContext: APIRequestContext | null = null;

  constructor(baseURL: string = 'http://localhost') {
    this.baseURL = baseURL;
  }

  async init() {
    this.apiContext = await request.newContext({
      baseURL: this.baseURL,
    });
  }

  async dispose() {
    await this.apiContext?.dispose();
  }

  /**
   * Create a grocery list
   */
  async createGroceryList(token: string, name: string, description?: string): Promise<GroceryList> {
    if (!this.apiContext) await this.init();

    const response = await this.apiContext!.post('/api/grocerylists', {
      headers: { Authorization: `Bearer ${token}` },
      data: { name, description }
    });

    if (!response.ok()) {
      throw new Error(`Create list failed: ${response.status()} ${await response.text()}`);
    }

    return await response.json();
  }

  /**
   * Get all grocery lists
   */
  async getGroceryLists(token: string): Promise<GroceryList[]> {
    if (!this.apiContext) await this.init();

    const response = await this.apiContext!.get('/api/grocerylists', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok()) {
      throw new Error(`Get lists failed: ${response.status()}`);
    }

    return await response.json();
  }

  /**
   * Get a grocery list by ID
   */
  async getGroceryList(token: string, listId: string): Promise<GroceryList> {
    if (!this.apiContext) await this.init();

    const response = await this.apiContext!.get(`/api/grocerylists/${listId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok()) {
      throw new Error(`Get list failed: ${response.status()}`);
    }

    return await response.json();
  }

  /**
   * Update a grocery list
   */
  async updateGroceryList(token: string, listId: string, name: string, description?: string): Promise<GroceryList> {
    if (!this.apiContext) await this.init();

    const response = await this.apiContext!.put(`/api/grocerylists/${listId}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name, description }
    });

    if (!response.ok()) {
      throw new Error(`Update list failed: ${response.status()}`);
    }

    return await response.json();
  }

  /**
   * Delete a grocery list
   */
  async deleteGroceryList(token: string, listId: string): Promise<void> {
    if (!this.apiContext) await this.init();

    const response = await this.apiContext!.delete(`/api/grocerylists/${listId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok()) {
      throw new Error(`Delete list failed: ${response.status()}`);
    }
  }

  /**
   * Add an item to a grocery list
   */
  async addGroceryItem(
    token: string,
    listId: string,
    name: string,
    quantity: number = 1,
    unit?: string,
    notes?: string,
    groupId?: string
  ): Promise<GroceryItem> {
    if (!this.apiContext) await this.init();

    const response = await this.apiContext!.post(`/api/grocerylists/${listId}/items`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name, quantity, unit, notes, groupId }
    });

    if (!response.ok()) {
      throw new Error(`Add item failed: ${response.status()} ${await response.text()}`);
    }

    return await response.json();
  }

  /**
   * Get all items in a grocery list
   */
  async getGroceryItems(token: string, listId: string): Promise<GroceryItem[]> {
    if (!this.apiContext) await this.init();

    const response = await this.apiContext!.get(`/api/grocerylists/${listId}/items`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok()) {
      throw new Error(`Get items failed: ${response.status()}`);
    }

    return await response.json();
  }

  /**
   * Update a grocery item
   */
  async updateGroceryItem(
    token: string,
    listId: string,
    itemId: string,
    updates: Partial<Omit<GroceryItem, 'id' | 'groceryListId' | 'createdAt' | 'updatedAt'>>
  ): Promise<GroceryItem> {
    if (!this.apiContext) await this.init();

    const response = await this.apiContext!.put(`/api/grocerylists/${listId}/items/${itemId}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: updates
    });

    if (!response.ok()) {
      throw new Error(`Update item failed: ${response.status()}`);
    }

    return await response.json();
  }

  /**
   * Mark an item as bought/unbought
   */
  async markItemBought(token: string, listId: string, itemId: string, isBought: boolean): Promise<GroceryItem> {
    if (!this.apiContext) await this.init();

    const response = await this.apiContext!.patch(`/api/grocerylists/${listId}/items/${itemId}/bought`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { isBought }
    });

    if (!response.ok()) {
      throw new Error(`Mark item bought failed: ${response.status()}`);
    }

    return await response.json();
  }

  /**
   * Delete a grocery item
   */
  async deleteGroceryItem(token: string, listId: string, itemId: string): Promise<void> {
    if (!this.apiContext) await this.init();

    const response = await this.apiContext!.delete(`/api/grocerylists/${listId}/items/${itemId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok()) {
      throw new Error(`Delete item failed: ${response.status()}`);
    }
  }

  /**
   * Create an item group
   */
  async createItemGroup(
    token: string,
    listId: string,
    name: string,
    color?: string,
    sortOrder: number = 0
  ): Promise<ItemGroup> {
    if (!this.apiContext) await this.init();

    const response = await this.apiContext!.post(`/api/grocerylists/${listId}/groups`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name, color, sortOrder }
    });

    if (!response.ok()) {
      throw new Error(`Create group failed: ${response.status()}`);
    }

    return await response.json();
  }

  /**
   * Get all groups in a grocery list
   */
  async getItemGroups(token: string, listId: string): Promise<ItemGroup[]> {
    if (!this.apiContext) await this.init();

    const response = await this.apiContext!.get(`/api/grocerylists/${listId}/groups`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok()) {
      throw new Error(`Get groups failed: ${response.status()}`);
    }

    return await response.json();
  }

  /**
   * Delete an item group
   */
  async deleteItemGroup(token: string, listId: string, groupId: string): Promise<void> {
    if (!this.apiContext) await this.init();

    const response = await this.apiContext!.delete(`/api/grocerylists/${listId}/groups/${groupId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok()) {
      throw new Error(`Delete group failed: ${response.status()}`);
    }
  }

  /**
   * Share a list with another user
   */
  async shareList(token: string, listId: string, userEmail: string, canEdit: boolean = false) {
    if (!this.apiContext) await this.init();

    const response = await this.apiContext!.post(`/api/grocerylists/${listId}/shares`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { userEmail, canEdit }
    });

    if (!response.ok()) {
      throw new Error(`Share list failed: ${response.status()}`);
    }

    return await response.json();
  }

  /**
   * Get all shares for a list
   */
  async getListShares(token: string, listId: string) {
    if (!this.apiContext) await this.init();

    const response = await this.apiContext!.get(`/api/grocerylists/${listId}/shares`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok()) {
      throw new Error(`Get shares failed: ${response.status()}`);
    }

    return await response.json();
  }
}
