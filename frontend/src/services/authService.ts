import { api } from './api';
import type { User, LoginResponse } from '../types';

export const authService = {
  getCurrentUser: () => api.get<User>('/auth/me'),

  logout: () => api.post<void>('/auth/logout', {}),

  login: async (provider: string, externalUserId: string, email: string, name: string, profilePictureUrl?: string) => {
    return api.post<LoginResponse>('/auth/login', {
      provider,
      externalUserId,
      email,
      name,
      profilePictureUrl,
    });
  },
};
