import { apiClient } from './apiClient';
import { User, Course, Certificate, TeacherRequest } from '../types';

export interface Enrollment {
  id: number;
  student: User;
  course: Course;
  enrolled_at: string;
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
      // Fetch all necessary data in parallel
      const [usersResponse, coursesResponse, enrollmentsResponse] = await Promise.all([
        apiClient.get('/users/'),
        apiClient.get('/courses/'),
        apiClient.get('/enrollments/')
      ]);

      const users = Array.isArray(usersResponse.data) ? usersResponse.data : (usersResponse.data?.results ?? []);
      const courses = Array.isArray(coursesResponse.data) ? coursesResponse.data : (coursesResponse.data?.results ?? []);
      const enrollments = Array.isArray(enrollmentsResponse.data) ? enrollmentsResponse.data : (enrollmentsResponse.data?.results ?? []);

      // Calculate statistics
      const totalStudents = users.filter((u: User) => u.role === 'student').length;
      const totalTeachers = users.filter((u: User) => u.role === 'teacher').length;
      const totalCourses = courses.length;
      const totalEnrollments = enrollments.length;

      // Calculate monthly enrollments (last 6 months)
      const monthlyEnrollments = calculateMonthlyEnrollments(enrollments);

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

  async blockUser(userId: number): Promise<User> {
    const response = await apiClient.patch(`/users/${userId}/`, { is_active: false });
    return response.data;
  },

  async unblockUser(userId: number): Promise<User> {
    const response = await apiClient.patch(`/users/${userId}/`, { is_active: true });
    return response.data;
  },

  // Course Management
  async getAllCourses(): Promise<Course[]> {
    const response = await apiClient.get('/courses/');
    return Array.isArray(response.data) ? response.data : (response.data?.results ?? []);
  },

  async approveCourse(courseId: number): Promise<Course> {
    const response = await apiClient.patch(`/courses/${courseId}/`, { status: 'published' });
    return response.data;
  },

  async rejectCourse(courseId: number): Promise<Course> {
    const response = await apiClient.patch(`/courses/${courseId}/`, { status: 'rejected' });
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
  async getAllTeacherRequests(): Promise<TeacherRequest[]> {
    const response = await apiClient.get('/teacher-requests/');
    return Array.isArray(response.data) ? response.data : (response.data?.results ?? []);
  },

  async createTeacherRequest(requestData: {
    first_name: string;
    last_name: string;
    email: string;
    username: string;
  }): Promise<TeacherRequest> {
    const response = await apiClient.post('/teacher-requests/', requestData);
    return response.data;
  },

  async approveTeacherRequest(requestId: number): Promise<User> {
    const response = await apiClient.post(`/teacher-requests/${requestId}/approve/`);
    return response.data;
  },

  async rejectTeacherRequest(requestId: number): Promise<TeacherRequest> {
    const response = await apiClient.post(`/teacher-requests/${requestId}/reject/`);
    return response.data;
  },

  async deleteTeacherRequest(requestId: number): Promise<void> {
    await apiClient.delete(`/teacher-requests/${requestId}/`);
  },

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
function calculateMonthlyEnrollments(enrollments: Enrollment[]): Array<{ month: string; enrollments: number }> {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentDate = new Date();
  const monthlyData: Array<{ month: string; enrollments: number }> = [];

  // Get last 6 months
  for (let i = 5; i >= 0; i--) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const monthName = months[date.getMonth()];
    
    const monthEnrollments = enrollments.filter(enrollment => {
      if (!enrollment.enrolled_at) return false;
      const enrollmentDate = new Date(enrollment.enrolled_at);
      return enrollmentDate.getMonth() === date.getMonth() && 
             enrollmentDate.getFullYear() === date.getFullYear();
    }).length;

    monthlyData.push({ month: monthName, enrollments: monthEnrollments });
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
