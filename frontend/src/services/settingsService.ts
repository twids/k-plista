import { api } from './api';
import type { ApiKey, CreateApiKeyDto, CreateApiKeyResponse, DefaultListDto } from '../types';

export const settingsService = {
  // API Keys
  getApiKeys: () => api.get<ApiKey[]>('/settings/api-keys'),
  
  createApiKey: (data: CreateApiKeyDto) => 
    api.post<CreateApiKeyResponse>('/settings/api-keys', data),
  
  deleteApiKey: (id: string) => 
    api.delete<void>(`/settings/api-keys/${id}`),

  // Default List
  getDefaultList: () => 
    api.get<DefaultListDto>('/settings/default-list'),
  
  setDefaultList: (data: DefaultListDto) => 
    api.put<void>('/settings/default-list', data),
};
