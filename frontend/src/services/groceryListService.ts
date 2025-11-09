import { api } from './api';
import type { GroceryList, CreateGroceryListDto } from '../types';

export const groceryListService = {
  getAll: () => api.get<GroceryList[]>('/grocerylists'),
  
  getById: (id: string) => api.get<GroceryList>(`/grocerylists/${id}`),
  
  create: (data: CreateGroceryListDto) => api.post<GroceryList>('/grocerylists', data),
  
  update: (id: string, data: CreateGroceryListDto) => 
    api.put(`/grocerylists/${id}`, data),
  
  delete: (id: string) => api.delete(`/grocerylists/${id}`),
};
