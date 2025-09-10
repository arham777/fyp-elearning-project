import apiClient from './apiClient';

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  course?: number | null;
  notif_type: string;
  is_read: boolean;
  created_at: string;
}

export const notificationsApi = {
  async list(): Promise<NotificationItem[]> {
    const res = await apiClient.get('/notifications/');
    const data = res.data;
    return Array.isArray(data) ? data : (data?.results ?? []);
  },

  async unreadCount(): Promise<number> {
    try {
      const res = await apiClient.get('/notifications/unread_count/');
      return Number(res.data?.unread ?? 0);
    } catch {
      return 0;
    }
  },

  async markRead(id: number): Promise<void> {
    await apiClient.post(`/notifications/${id}/mark_read/`);
  },

  async markAllRead(): Promise<number> {
    const res = await apiClient.post('/notifications/mark_all_read/');
    return Number(res.data?.marked ?? 0);
  },

  async broadcast(
    audience: 'teacher' | 'student' | 'teachers' | 'students',
    title: string,
    message: string,
    notif_type: 'info' | 'warning' | 'success' = 'info'
  ): Promise<{ success: boolean; created: number }> {
    const res = await apiClient.post('/notifications/broadcast/', {
      audience,
      title,
      message,
      notif_type
    });
    return {
      success: Boolean(res.data?.success),
      created: Number(res.data?.created ?? 0)
    };
  }
};
