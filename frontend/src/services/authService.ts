import { api } from './api';
import type { User } from '../types';

export const authService = {
  getCurrentUser: () => api.get<User>('/auth/me'),

  login: async (provider: string, externalUserId: string, email: string, name: string, profilePictureUrl?: string) => {
    return api.post<User>('/auth/login', {
      provider,
      externalUserId,
      email,
      name,
      profilePictureUrl,
    });
  },
};
