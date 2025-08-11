import apiClient from '@/api/apiClient';
import { User } from '@/types';

export const usersApi = {
  async getUsers(): Promise<User[]> {
    const response = await apiClient.get('/users/');
    const data = response.data;
    // Normalize both paginated and non-paginated responses
    return Array.isArray(data) ? data : (data?.results ?? []);
  },

  async changePassword(userId: number, newPassword: string): Promise<User> {
    const response = await apiClient.patch(`/users/${userId}/`, {
      password: newPassword,
    });
    return response.data as User;
  },
};

export default usersApi;


