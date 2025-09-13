import { apiClient } from './apiClient';
import { SupportRequest } from '@/types';

export const supportApi = {
  async createSupportRequest(payload: {
    email: string;
    username?: string;
    reason_seen?: string;
    until_reported?: string;
    message?: string;
  }): Promise<SupportRequest> {
    const resp = await apiClient.post('/support/', payload);
    return resp.data as SupportRequest;
  },
  async listSupportRequests(): Promise<SupportRequest[]> {
    const resp = await apiClient.get('/support/');
    return Array.isArray(resp.data) ? resp.data : (resp.data?.results ?? []);
  },
  async closeSupportRequest(id: number): Promise<SupportRequest> {
    const resp = await apiClient.post(`/support/${id}/close/`);
    return resp.data as SupportRequest;
  }
};

export default supportApi;
