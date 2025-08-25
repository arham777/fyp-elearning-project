import apiClient from './apiClient';
import { ApiResponse, Course, Enrollment, CourseModule, User, Certificate } from '@/types';

export const coursesApi = {
  async getCourses(params?: {
    search?: string;
    category?: string;
    price_min?: number;
    price_max?: number;
    page?: number;
  }): Promise<Course[]> {
    const response = await apiClient.get('/courses/', { params });
    const data = response.data;
    // Normalize both paginated ({ results: [...] }) and non-paginated ([...]) responses
    return Array.isArray(data) ? data : (data?.results ?? []);
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

  async getCourseModule(courseId: number, moduleId: number): Promise<CourseModule> {
    const response = await apiClient.get(`/courses/${courseId}/modules/${moduleId}/`);
    return response.data;
  },

  async getModuleContents(courseId: number, moduleId: number) {
    const response = await apiClient.get(`/courses/${courseId}/modules/${moduleId}/content/`);
    return response.data;
  },

  async getModuleContentProgress(courseId: number, moduleId: number): Promise<number[]> {
    const response = await apiClient.get(`/courses/${courseId}/modules/${moduleId}/content/progress/`);
    return response.data as number[];
  },

  async getContent(courseId: number, moduleId: number, contentId: number) {
    const response = await apiClient.get(
      `/courses/${courseId}/modules/${moduleId}/content/${contentId}/`
    );
    return response.data;
  },

  async markContentComplete(courseId: number, moduleId: number, contentId: number) {
    const response = await apiClient.post(`/courses/${courseId}/modules/${moduleId}/content/${contentId}/mark_complete/`);
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

  async getMyCertificates(): Promise<Certificate[]> {
    const response = await apiClient.get('/certificates/');
    return response.data;
  },

  async getCourseStudents(courseId: number): Promise<User[]> {
    const response = await apiClient.get(`/courses/${courseId}/students/`);
    const data = response.data;
    return Array.isArray(data) ? data : (data?.results ?? []);
  },

  async getCourseStudentsPaged(
    courseId: number,
    params?: { page?: number; page_size?: number; search?: string; ordering?: string }
  ): Promise<ApiResponse<User>> {
    const response = await apiClient.get(`/courses/${courseId}/students/`, { params });
    const data = response.data;
    // If pagination is disabled server-side, normalize to ApiResponse
    if (Array.isArray(data)) {
      return { results: data } as ApiResponse<User>;
    }
    return data as ApiResponse<User>;
  },
};