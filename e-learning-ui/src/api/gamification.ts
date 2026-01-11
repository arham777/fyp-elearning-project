import { apiClient } from './apiClient';
import {
  UserStats,
  UserBadge,
  BadgeWithStatus,
  XPTransaction,
  LeaderboardResponse,
  RecordActivityResponse,
} from '@/types';

/**
 * Get current user's gamification stats
 */
export const getMyStats = async (): Promise<UserStats> => {
  const response = await apiClient.get('/gamification/my_stats/');
  return response.data;
};

/**
 * Get current user's earned badges
 */
export const getMyBadges = async (): Promise<UserBadge[]> => {
  const response = await apiClient.get('/gamification/my_badges/');
  return response.data;
};

/**
 * Get all available badges with earned status
 */
export const getAllBadges = async (): Promise<BadgeWithStatus[]> => {
  const response = await apiClient.get('/gamification/all_badges/');
  return response.data;
};

/**
 * Get user's XP transaction history
 */
export const getXPHistory = async (): Promise<XPTransaction[]> => {
  const response = await apiClient.get('/gamification/xp_history/');
  return response.data;
};

/**
 * Get weekly leaderboard
 */
export const getLeaderboard = async (): Promise<LeaderboardResponse> => {
  const response = await apiClient.get('/gamification/leaderboard/');
  return response.data;
};

/**
 * Record learning activity (updates streak)
 */
export const recordActivity = async (
  timeSpentSeconds: number = 0
): Promise<RecordActivityResponse> => {
  const response = await apiClient.post('/gamification/record_activity/', {
    time_spent_seconds: timeSpentSeconds,
  });
  return response.data;
};

/**
 * Seed default badges (admin only)
 */
export const seedBadges = async (): Promise<{ message: string; total_badges: number }> => {
  const response = await apiClient.post('/gamification/seed_badges/');
  return response.data;
};

/**
 * Get badges for a specific user (admin only)
 */
export const getUserBadges = async (userId: number): Promise<UserBadge[]> => {
  const response = await apiClient.get(`/gamification/user-badges/${userId}/`);
  return response.data;
};
