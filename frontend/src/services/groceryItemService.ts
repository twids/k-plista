import { api } from './api';
import type { GroceryItem, CreateGroceryItemDto } from '../types';

export const groceryItemService = {
  getAll: (listId: string) => 
    api.get<GroceryItem[]>(`/grocerylists/${listId}/items`),
  
  getById: (listId: string, id: string) => 
    api.get<GroceryItem>(`/grocerylists/${listId}/items/${id}`),
  
  create: (listId: string, data: CreateGroceryItemDto) => 
    api.post<GroceryItem>(`/grocerylists/${listId}/items`, data),
  
  update: (listId: string, id: string, data: CreateGroceryItemDto) => 
    api.put(`/grocerylists/${listId}/items/${id}`, data),
  
  markBought: (listId: string, id: string, isBought: boolean) => 
    api.patch(`/grocerylists/${listId}/items/${id}/bought`, { isBought }),
  
  delete: (listId: string, id: string) => 
    api.delete(`/grocerylists/${listId}/items/${id}`),
};
