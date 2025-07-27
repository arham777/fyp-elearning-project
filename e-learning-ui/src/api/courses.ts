import apiClient from './apiClient';
import { Course, ApiResponse, Enrollment, CourseModule } from '@/types';

export const coursesApi = {
  async getCourses(params?: {
    search?: string;
    category?: string;
    price_min?: number;
    price_max?: number;
    page?: number;
  }): Promise<ApiResponse<Course>> {
    const response = await apiClient.get('/courses/', { params });
    return response.data;
  },

  async getCourse(id: number): Promise<Course> {
    const response = await apiClient.get(`/courses/${id}/`);
    return response.data;
  },

  async createCourse(courseData: Partial<Course>): Promise<Course> {
    const response = await apiClient.post('/courses/', courseData);
    return response.data;
  },

  async updateCourse(id: number, courseData: Partial<Course>): Promise<Course> {
    const response = await apiClient.put(`/courses/${id}/`, courseData);
    return response.data;
  },

  async deleteCourse(id: number): Promise<void> {
    await apiClient.delete(`/courses/${id}/`);
  },

  async getCourseModules(courseId: number): Promise<CourseModule[]> {
    const response = await apiClient.get(`/courses/${courseId}/modules/`);
    return response.data;
  },

  async enrollInCourse(courseId: number): Promise<Enrollment> {
    const response = await apiClient.post(`/courses/${courseId}/enroll/`);
    return response.data;
  },

  async getMyEnrollments(): Promise<Enrollment[]> {
    const response = await apiClient.get('/enrollments/');
    return response.data;
  },

  async getMyCourses(): Promise<Course[]> {
    const response = await apiClient.get('/courses/my-courses/');
    return response.data;
  },
};