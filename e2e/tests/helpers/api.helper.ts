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
  description?: string; // API uses description, not notes
  quantity: number;
  unit?: string;
  isBought: boolean;
  groupId?: string;
  groupName?: string;
  groceryListId: string;
  createdAt: string;
  updatedAt: string;
  boughtAt?: string;
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

    // API returns 204 No Content, so we need to fetch the updated list
    const lists = await this.getGroceryLists(token);
    const updatedList = lists.find(list => list.id === listId);
    if (!updatedList) {
      throw new Error(`List ${listId} not found after update`);
    }
    return updatedList;
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
      data: { name, quantity, unit, description: notes, groupId }
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

    // Fetch current item to get all fields (API requires all fields for PUT)
    const items = await this.getGroceryItems(token, listId);
    const currentItem = items.find(item => item.id === itemId);
    if (!currentItem) {
      throw new Error(`Item ${itemId} not found`);
    }

    // Merge updates with current values
    const payload = {
      name: updates.name ?? currentItem.name,
      description: updates.description ?? currentItem.description,
      quantity: updates.quantity ?? currentItem.quantity,
      unit: updates.unit ?? currentItem.unit,
      groupId: updates.groupId ?? currentItem.groupId
    };

    const response = await this.apiContext!.put(`/api/grocerylists/${listId}/items/${itemId}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: payload
    });

    if (!response.ok()) {
      throw new Error(`Update item failed: ${response.status()}`);
    }

    // API returns 204 No Content, so we need to fetch the updated item
    const updatedItems = await this.getGroceryItems(token, listId);
    const updatedItem = updatedItems.find(item => item.id === itemId);
    if (!updatedItem) {
      throw new Error(`Item ${itemId} not found after update`);
    }
    return updatedItem;
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

    // API returns 204 No Content, so we need to fetch the updated item
    const items = await this.getGroceryItems(token, listId);
    const updatedItem = items.find(item => item.id === itemId);
    if (!updatedItem) {
      throw new Error(`Item ${itemId} not found after marking bought`);
    }
    return updatedItem;
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
      data: { sharedWithUserEmail: userEmail, canEdit }
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
