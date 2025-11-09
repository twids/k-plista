import { api } from './api';
import type { ItemGroup, CreateItemGroupDto } from '../types';

export const itemGroupService = {
  getAll: (listId: string) => 
    api.get<ItemGroup[]>(`/grocerylists/${listId}/groups`),
  
  getById: (listId: string, id: string) => 
    api.get<ItemGroup>(`/grocerylists/${listId}/groups/${id}`),
  
  create: (listId: string, data: CreateItemGroupDto) => 
    api.post<ItemGroup>(`/grocerylists/${listId}/groups`, data),
  
  update: (listId: string, id: string, data: CreateItemGroupDto) => 
    api.put(`/grocerylists/${listId}/groups/${id}`, data),
  
  delete: (listId: string, id: string) => 
    api.delete(`/grocerylists/${listId}/groups/${id}`),
};
