import apiClient from './apiClient';
import { ApiResponse, Course, Enrollment, CourseModule, User, Certificate, Assignment, AssignmentQuestion, SubmissionAnswer, Submission, StudentCourseProgress, StudentSubmissionsResponse } from '@/types';

export const coursesApi = {
  async getCourses(
    params?: {
      search?: string;
      category?: string;
      price_min?: number;
      price_max?: number;
      page?: number;
    },
    options?: { signal?: AbortSignal }
  ): Promise<Course[]> {
    const response = await apiClient.get('/courses/', { params, signal: options?.signal });
    const data = response.data;
    // Normalize both paginated ({ results: [...] }) and non-paginated ([...]) responses
    return Array.isArray(data) ? data : (data?.results ?? []);
  },

  async getCourse(id: number): Promise<Course> {
    const response = await apiClient.get(`/courses/${id}/`);
    return response.data;
  },

  async getCourseRatings(id: number) {
    const response = await apiClient.get(`/courses/${id}/ratings/`);
    return response.data;
  },

  async replyToReview(courseId: number, ratingId: number, reply: string) {
    // Teacher/Admin endpoint to reply to a specific rating's review
    const response = await apiClient.post(`/courses/${courseId}/reply-review/`, {
      rating_id: ratingId,
      reply,
    });
    return response.data;
  },

  async rateCourse(id: number, rating: number, review?: string) {
    const response = await apiClient.post(`/courses/${id}/rate/`, { rating, review });
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

  async publishCourse(id: number): Promise<Course> {
    const response = await apiClient.post(`/courses/${id}/publish/`);
    return response.data as Course;
  },

  async unpublishCourse(id: number): Promise<Course> {
    const response = await apiClient.post(`/courses/${id}/unpublish/`);
    return response.data as Course;
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

  async createCourseModule(
    courseId: number,
    data: { title: string; description?: string; after_module_id?: number }
  ): Promise<CourseModule> {
    const response = await apiClient.post(`/courses/${courseId}/modules/`, data);
    return response.data;
  },

  async updateCourseModule(
    courseId: number,
    moduleId: number,
    data: { title?: string; description?: string; order?: number }
  ): Promise<CourseModule> {
    const response = await apiClient.patch(`/courses/${courseId}/modules/${moduleId}/`, data);
    return response.data;
  },

  async deleteCourseModule(courseId: number, moduleId: number): Promise<void> {
    await apiClient.delete(`/courses/${courseId}/modules/${moduleId}/`);
  },

  async getModuleContents(courseId: number, moduleId: number) {
    const response = await apiClient.get(`/courses/${courseId}/modules/${moduleId}/content/`);
    return response.data;
  },

  async createModuleContent(
    courseId: number,
    moduleId: number,
    data: {
      module: number;
      title: string;
      content_type: 'video' | 'reading';
      url?: string;
      text?: string;
      duration_minutes?: number;
      order?: number;
      after_content_id?: number;
    }
  ) {
    const response = await apiClient.post(
      `/courses/${courseId}/modules/${moduleId}/content/`,
      data
    );
    return response.data;
  },

  async createModuleContentUpload(
    courseId: number,
    moduleId: number,
    formData: FormData,
    onUploadProgress?: (progressEvent: { loaded: number; total?: number; progress?: number }) => void
  ) {
    const response = await apiClient.post(
      `/courses/${courseId}/modules/${moduleId}/content/`,
      formData,
      { 
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (onUploadProgress) {
            const progress = progressEvent.total 
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;
            onUploadProgress({
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              progress
            });
          }
        }
      }
    );
    return response.data;
  },

  async getModuleContentProgress(courseId: number, moduleId: number): Promise<number[]> {
    const response = await apiClient.get(`/courses/${courseId}/modules/${moduleId}/content/progress/`);
    return response.data as number[];
  },

  async getCourseAssignments(courseId: number, params?: { module?: number }): Promise<Assignment[]> {
    const response = await apiClient.get(`/courses/${courseId}/assignments/`, { params });
    return response.data as Assignment[];
  },

  async createAssignment(
    courseId: number,
    payload: {
      module?: number;
      assignment_type: 'mcq' | 'qa';
      title: string;
      description: string;
      total_points?: number;
      passing_grade?: number;
      max_attempts?: number;
    }
  ): Promise<Assignment> {
    const response = await apiClient.post(`/courses/${courseId}/assignments/`, payload);
    return response.data as Assignment;
  },

  async createAssignmentQuestions(
    courseId: number,
    assignmentId: number,
    questions: Omit<AssignmentQuestion, 'assignment'>[]
  ) {
    // Bulk create one by one for now; could add backend bulk later
    const results: AssignmentQuestion[] = [];
    for (const [idx, q] of questions.entries()) {
      const res = await apiClient.post(`/courses/${courseId}/assignments/${assignmentId}/questions/`, {
        ...q,
        assignment: assignmentId,
        order: q.order ?? idx + 1,
      });
      results.push(res.data);
    }
    return results;
  },

  async getAssignment(courseId: number, assignmentId: number): Promise<Assignment & { questions?: AssignmentQuestion[] }> {
    const response = await apiClient.get(`/courses/${courseId}/assignments/${assignmentId}/`);
    return response.data;
  },

  async createAssignmentSubmission(
    courseId: number,
    assignmentId: number,
    data: { content: string; answers?: SubmissionAnswer[]; file?: File | null }
  ) {
    if (data.file) {
      const fd = new FormData();
      fd.append('content', data.content || 'submission');
      if (data.answers) fd.append('answers', JSON.stringify(data.answers));
      fd.append('file', data.file);
      const res = await apiClient.post(`/courses/${courseId}/assignments/${assignmentId}/submissions/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    }
    const res = await apiClient.post(`/courses/${courseId}/assignments/${assignmentId}/submissions/`, {
      content: data.content || 'submission',
      answers: data.answers ?? [],
    });
    return res.data;
  },

  async getAssignmentSubmissions(courseId: number, assignmentId: number): Promise<Submission[]> {
    const res = await apiClient.get(`/courses/${courseId}/assignments/${assignmentId}/submissions/`);
    return res.data as Submission[];
  },

  async gradeSubmission(courseId: number, assignmentId: number, submissionId: number, grade: number, feedback?: string): Promise<Submission> {
    const res = await apiClient.post(`/courses/${courseId}/assignments/${assignmentId}/submissions/${submissionId}/grade/`, { grade, feedback });
    return res.data as Submission;
  },

  async getContent(courseId: number, moduleId: number, contentId: number) {
    const response = await apiClient.get(
      `/courses/${courseId}/modules/${moduleId}/content/${contentId}/`
    );
    return response.data;
  },

  async updateModuleContent(
    courseId: number,
    moduleId: number,
    contentId: number,
    data: {
      title?: string;
      content_type?: 'video' | 'reading';
      url?: string;
      text?: string;
      order?: number;
      duration_minutes?: number;
    }
  ) {
    const response = await apiClient.patch(
      `/courses/${courseId}/modules/${moduleId}/content/${contentId}/`,
      data
    );
    return response.data;
  },

  async updateModuleContentWithFile(
    courseId: number,
    moduleId: number,
    contentId: number,
    formData: FormData,
    onUploadProgress?: (progressEvent: { loaded: number; total?: number; progress?: number }) => void
  ) {
    const response = await apiClient.patch(
      `/courses/${courseId}/modules/${moduleId}/content/${contentId}/`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (onUploadProgress) {
            const progress = progressEvent.total 
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;
            onUploadProgress({
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              progress
            });
          }
        }
      }
    );
    return response.data;
  },

  async deleteModuleContent(courseId: number, moduleId: number, contentId: number): Promise<void> {
    await apiClient.delete(`/courses/${courseId}/modules/${moduleId}/content/${contentId}/`);
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

  async refreshMyCompletion(): Promise<{ updated_to_completed: number }> {
    const response = await apiClient.post('/enrollments/refresh-completion/');
    return response.data as { updated_to_completed: number };
  },

  async getMyCourses(): Promise<Course[]> {
    const response = await apiClient.get('/courses/my-courses/');
    return response.data;
  },

  async getMyCertificates(): Promise<Certificate[]> {
    const response = await apiClient.get('/certificates/');
    return response.data;
  },

  async getCertificate(id: number): Promise<Certificate> {
    const response = await apiClient.get(`/certificates/${id}/`);
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

  async getAssignmentProgress(courseId: number): Promise<number[]> {
    try {
      const response = await apiClient.get(`/courses/${courseId}/assignments/progress/`);
      return response.data as number[];
    } catch (error) {
      // Fallback: get completed assignments by checking submissions
      const assignments = await this.getCourseAssignments(courseId);
      const completedIds: number[] = [];
      
      for (const assignment of assignments) {
        try {
          const submissions = await this.getAssignmentSubmissions(courseId, assignment.id);
          const userSubmission = submissions.find(s => s.grade !== null && s.grade >= (assignment.passing_grade || 60));
          if (userSubmission) {
            completedIds.push(assignment.id);
          }
        } catch {
          // Skip if can't access submissions
        }
      }
      return completedIds;
    }
  },

  async getModuleProgress(courseId: number, moduleId: number): Promise<{
    completedContentIds: number[];
    completedAssignmentIds: number[];
    assignmentResults: Record<number, { score: number; passed: boolean; totalPoints: number; attemptsUsed: number; maxAttempts: number; canRetake: boolean }>;
  }> {
    const [contentProgress, assignments] = await Promise.all([
      this.getModuleContentProgress(courseId, moduleId),
      this.getCourseAssignments(courseId, { module: moduleId })
    ]);

    const completedAssignmentIds: number[] = [];
    const assignmentResults: Record<number, { score: number; passed: boolean; totalPoints: number; attemptsUsed: number; maxAttempts: number; canRetake: boolean }> = {};
    
    for (const assignment of assignments) {
      try {
        const submissions = await this.getAssignmentSubmissions(courseId, assignment.id);
        const userSubmissions = submissions.filter(s => s.grade !== null);
        const bestSubmission = userSubmissions.reduce((best, current) => 
          !best || current.grade > best.grade ? current : best, null as any);
        
        if (bestSubmission) {
          const score = bestSubmission.grade;
          const totalPoints = assignment.total_points || 100;
          const passingGrade = assignment.passing_grade || 60;
          const passed = score >= passingGrade;
          const attemptsUsed = userSubmissions.length;
          const maxAttempts = assignment.max_attempts || 3;
          const canRetake = attemptsUsed < maxAttempts && !passed;
          
          assignmentResults[assignment.id] = {
            score,
            passed,
            totalPoints,
            attemptsUsed,
            maxAttempts,
            canRetake
          };
          
          if (passed) {
            completedAssignmentIds.push(assignment.id);
          }
        }
      } catch {
        // Skip if can't access submissions
      }
    }

    return {
      completedContentIds: contentProgress,
      completedAssignmentIds,
      assignmentResults
    };
  },

  async getStudentProgress(courseId: number, studentId: number): Promise<StudentCourseProgress> {
    const res = await apiClient.get(`/courses/${courseId}/student-progress/${studentId}/`);
    return res.data as StudentCourseProgress;
  },

  async getStudentSubmissions(courseId: number, studentId: number): Promise<StudentSubmissionsResponse> {
    const res = await apiClient.get(`/courses/${courseId}/student-submissions/${studentId}/`);
    return res.data as StudentSubmissionsResponse;
  },
};