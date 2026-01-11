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

  async updateLearningPreferences(input: {
    preferred_category?: string | null;
    skill_level?: 'beginner' | 'intermediate' | 'advanced' | null;
    learning_goal?: 'job' | 'skill_upgrade' | 'certification' | null;
  }): Promise<User> {
    const response = await apiClient.patch('/users/learning-preferences/', input);
    return response.data as User;
  },

  async getProgressHeatmap(input?: {
    days?: number;
    courseId?: number;
  }): Promise<Array<{ date: string; count: number }>> {
    const response = await apiClient.get('/users/progress-heatmap/', {
      params: {
        days: input?.days,
        course_id: input?.courseId,
      },
    });
    const data = response.data;
    return Array.isArray(data) ? data : [];
  },
};

export default usersApi;


