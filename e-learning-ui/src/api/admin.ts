import { apiClient } from './apiClient';
import { User, Course, Certificate, ApiResponse } from '../types';

export interface Enrollment {
  id: number;
  student: User;
  course: Course;
  // Backend uses `enrollment_date`; some legacy UI still expects `enrolled_at`.
  // Make both optional and prefer `enrollment_date` when present.
  enrolled_at?: string;
  enrollment_date?: string;
}

export interface AdminStats {
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
  totalEnrollments: number;
  monthlyEnrollments: Array<{ month: string; enrollments: number }>;
  recentUsers: User[];
  pendingCourses: Course[];
  recentEnrollments: Enrollment[];
}

export interface AdminDashboardData {
  stats: AdminStats;
  users: User[];
  courses: Course[];
  enrollments: Enrollment[];
  certificates: Certificate[];
}

export const adminApi = {
  // Dashboard Statistics
  async getDashboardStats(): Promise<AdminStats> {
    try {
      // Fetch users, courses, enrollments in parallel
      const [usersResponse, coursesResponse, enrollmentsResponse] = await Promise.all([
        apiClient.get('/users/?page_size=1000'),
        apiClient.get('/courses/?page_size=1000'),
        apiClient.get('/enrollments/?page_size=1000')
      ]);

      const users = Array.isArray(usersResponse.data) ? usersResponse.data : (usersResponse.data?.results ?? []);
      const courses = Array.isArray(coursesResponse.data) ? coursesResponse.data : (coursesResponse.data?.results ?? []);
      const enrollments = Array.isArray(enrollmentsResponse.data) ? enrollmentsResponse.data : (enrollmentsResponse.data?.results ?? []);

      // Calculate statistics
      const totalStudents = users.filter((u: User) => u.role === 'student').length;
      const totalTeachers = users.filter((u: User) => u.role === 'teacher').length;
      const totalCourses = courses.length;
      const totalEnrollments = enrollments.length;

      // Try to fetch backend-aggregated monthly enrollments; fallback to client-side calc
      let monthlyEnrollments: Array<{ month: string; enrollments: number }> = [];
      try {
        const monthlyResponse = await apiClient.get('/enrollments/stats/monthly/?months=12');
        monthlyEnrollments = (Array.isArray(monthlyResponse.data) ? monthlyResponse.data : [])
          .map((item: any) => ({
            month: item?.year ? `${item.month} ${String(item.year).slice(-2)}` : String(item?.month ?? ''),
            enrollments: Number(item?.enrollments ?? 0)
          }));
      } catch (e) {
        console.warn('Falling back to client-side monthly enrollment calculation:', e);
        monthlyEnrollments = calculateMonthlyEnrollments(enrollments, 12);
      }

      // Get recent data
      const recentUsers = users.slice(-5).reverse();
      const pendingCourses = courses.filter((c: Course) => c.status === 'pending' || c.status === 'draft');
      const recentEnrollments = enrollments.slice(-10).reverse();

      return {
        totalStudents,
        totalTeachers,
        totalCourses,
        totalEnrollments,
        monthlyEnrollments,
        recentUsers,
        pendingCourses,
        recentEnrollments
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  },

  // User Management
  async getAllUsers(): Promise<User[]> {
    const response = await apiClient.get('/users/');
    return Array.isArray(response.data) ? response.data : (response.data?.results ?? []);
  },

  async listUsersPaged(params?: {
    page?: number;
    page_size?: number;
    role?: 'student' | 'teacher';
    search?: string;
    ordering?: string;
  }): Promise<ApiResponse<User>> {
    const response = await apiClient.get('/users/', {
      params: {
        page: params?.page ?? 1,
        page_size: params?.page_size ?? 20,
        role: params?.role, // backend may ignore; harmless
        search: params?.search, // backend may ignore; harmless
        ordering: params?.ordering,
      }
    });

    const data = response.data;
    // Normalize to ApiResponse shape
    const results: User[] = Array.isArray(data) ? data : (data?.results ?? []);

    // Client-side filtering fallback if backend doesn't support it
    const filtered = results.filter((u: User) => {
      const byRole = params?.role ? u.role === params.role : true;
      const q = (params?.search || '').trim().toLowerCase();
      const bySearch = !q || [u.first_name, u.last_name, u.username, u.email]
        .map((v) => String(v || '').toLowerCase())
        .some((s) => s.includes(q));
      return byRole && bySearch;
    });

    return {
      count: Number(data?.count ?? filtered.length),
      next: data?.next ?? null,
      previous: data?.previous ?? null,
      results: filtered,
    } as any;
  },

  async createUser(userData: Partial<User>): Promise<User> {
    const response = await apiClient.post('/users/', userData);
    return response.data;
  },

  async updateUser(userId: number, userData: Partial<User>): Promise<User> {
    const response = await apiClient.patch(`/users/${userId}/`, userData);
    return response.data;
  },

  async deleteUser(userId: number): Promise<void> {
    await apiClient.delete(`/users/${userId}/`);
  },

  async blockUser(userId: number, payload?: { reason?: string; duration_days?: number; until?: string }): Promise<User> {
    const response = await apiClient.post(`/users/${userId}/block/`, payload ?? {});
    return response.data as User;
  },

  async unblockUser(userId: number): Promise<User> {
    const response = await apiClient.post(`/users/${userId}/unblock/`, {});
    return response.data as User;
  },

  // Course Management
  async getAllCourses(): Promise<Course[]> {
    const response = await apiClient.get('/courses/');
    return Array.isArray(response.data) ? response.data : (response.data?.results ?? []);
  },

  async approveCourse(courseId: number, note?: string): Promise<Course> {
    const response = await apiClient.post(`/courses/${courseId}/approve/`, { note });
    return response.data;
  },

  async rejectCourse(courseId: number, note: string): Promise<Course> {
    const response = await apiClient.post(`/courses/${courseId}/reject/`, { note });
    return response.data;
  },

  async deleteCourse(courseId: number): Promise<void> {
    await apiClient.delete(`/courses/${courseId}/`);
  },

  // Enrollment Management
  async getAllEnrollments(): Promise<Enrollment[]> {
    const response = await apiClient.get('/enrollments/');
    return Array.isArray(response.data) ? response.data : (response.data?.results ?? []);
  },

  async deleteEnrollment(enrollmentId: number): Promise<void> {
    await apiClient.delete(`/enrollments/${enrollmentId}/`);
  },

  // Certificate Management
  async getAllCertificates(): Promise<Certificate[]> {
    const response = await apiClient.get('/certificates/');
    return Array.isArray(response.data) ? response.data : (response.data?.results ?? []);
  },

  async revokeCertificate(certificateId: number): Promise<Certificate> {
    const response = await apiClient.patch(`/certificates/${certificateId}/`, { is_revoked: true });
    return response.data;
  },

  async deleteCertificate(certificateId: number): Promise<void> {
    await apiClient.delete(`/certificates/${certificateId}/`);
  },

  // Teacher Request Management
  // (Teacher requests removed; teachers can self-register like students)

  // Analytics and Reports
  async getUserGrowthData(): Promise<Array<{ month: string; users: number }>> {
    try {
      const users = await this.getAllUsers();
      return calculateUserGrowth(users);
    } catch (error) {
      console.error('Error fetching user growth data:', error);
      return [];
    }
  },

  async getCourseStats(): Promise<Array<{ category: string; count: number }>> {
    try {
      const courses = await this.getAllCourses();
      return calculateCourseStats(courses);
    } catch (error) {
      console.error('Error fetching course stats:', error);
      return [];
    }
  }
};

// Helper functions
function calculateMonthlyEnrollments(
  enrollments: Enrollment[],
  monthsCount: number = 12
): Array<{ month: string; enrollments: number }> {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentDate = new Date();
  const monthlyData: Array<{ month: string; enrollments: number }> = [];

  // Get trailing monthsCount months
  const span = Math.max(1, monthsCount);
  for (let i = span - 1; i >= 0; i--) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const monthName = months[date.getMonth()];
    
    const monthEnrollments = enrollments.filter(enrollment => {
      const dtStr = (enrollment.enrollment_date || enrollment.enrolled_at);
      if (!dtStr) return false;
      const enrollmentDate = new Date(dtStr);
      return enrollmentDate.getMonth() === date.getMonth() &&
             enrollmentDate.getFullYear() === date.getFullYear();
    }).length;

    // Include year for clarity, matching backend normalization style
    monthlyData.push({ month: `${monthName} ${String(date.getFullYear()).slice(-2)}`, enrollments: monthEnrollments });
  }

  return monthlyData;
}

function calculateUserGrowth(users: User[]): Array<{ month: string; users: number }> {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentDate = new Date();
  const growthData: Array<{ month: string; users: number }> = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const monthName = months[date.getMonth()];
    
    const monthUsers = users.filter(user => {
      if (!user.date_joined) return false;
      const userDate = new Date(user.date_joined);
      return userDate.getMonth() === date.getMonth() && 
             userDate.getFullYear() === date.getFullYear();
    }).length;

    growthData.push({ month: monthName, users: monthUsers });
  }

  return growthData;
}

function calculateCourseStats(courses: Course[]): Array<{ category: string; count: number }> {
  const categoryStats: Record<string, number> = {};
  
  courses.forEach(course => {
    const category = course.category || 'Uncategorized';
    categoryStats[category] = (categoryStats[category] || 0) + 1;
  });

  return Object.entries(categoryStats).map(([category, count]) => ({ category, count }));
}

export default adminApi;
