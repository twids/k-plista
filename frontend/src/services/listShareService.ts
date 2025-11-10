import { api } from './api';
import type { ListShare, CreateListShareDto } from '../types';

export const listShareService = {
  getAll: (listId: string) => 
    api.get<ListShare[]>(`/grocerylists/${listId}/shares`),
  
  create: (listId: string, data: CreateListShareDto) => 
    api.post<ListShare>(`/grocerylists/${listId}/shares`, data),
  
  update: (listId: string, id: string, canEdit: boolean) => 
    api.put(`/grocerylists/${listId}/shares/${id}`, { canEdit }),
  
  delete: (listId: string, id: string) => 
    api.delete(`/grocerylists/${listId}/shares/${id}`),
};
