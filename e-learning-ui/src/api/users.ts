import apiClient from '@/api/apiClient';
import { User } from '@/types';

export const usersApi = {
  async changePassword(userId: number, newPassword: string): Promise<User> {
    const response = await apiClient.patch(`/users/${userId}/`, {
      password: newPassword,
    });
    return response.data as User;
  },
};

export default usersApi;


