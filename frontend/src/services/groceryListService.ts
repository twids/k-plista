import { api } from './api';
import type { GroceryList, CreateGroceryListDto, MagicLink, AcceptShare, GenerateMagicLinkDto } from '../types';

export const groceryListService = {
  getAll: () => api.get<GroceryList[]>('/grocerylists'),
  
  getById: (id: string) => api.get<GroceryList>(`/grocerylists/${id}`),
  
  create: (data: CreateGroceryListDto) => api.post<GroceryList>('/grocerylists', data),
  
  update: (id: string, data: CreateGroceryListDto) => 
    api.put(`/grocerylists/${id}`, data),
  
  delete: (id: string) => api.delete(`/grocerylists/${id}`),
  
  generateMagicLink: (id: string, data: GenerateMagicLinkDto) => api.post<MagicLink>(`/grocerylists/${id}/magiclink`, data),
  
  acceptMagicLink: (token: string) => api.get<AcceptShare>(`/grocerylists/accept-share/${token}`),
};
