// TypeScript interfaces for LMS system

export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: UserRole;
  created_at: string;
  avatar?: string;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  price: number;
  teacher: User;
  created_at: string;
  updated_at: string;
  thumbnail?: string;
  is_published: boolean;
  modules?: CourseModule[];
  assignments?: Assignment[];
  enrollment_count?: number;
}

export interface CourseModule {
  id: number;
  course: number;
  title: string;
  description: string;
  order: number;
  created_at: string;
  contents?: Content[];
}

export interface Content {
  id: number;
  module: number;
  title: string;
  content_type: 'video' | 'reading';
  url?: string;
  video?: string;
  text?: string;
  order: number;
  duration_minutes: number;
  created_at: string;
}

export interface Assignment {
  id: number;
  course: number;
  module?: number;
  title: string;
  description: string;
  due_date: string;
  total_points: number;
  passing_grade: number;
  created_at: string;
}

export interface Enrollment {
  id: number;
  student?: User; // optional; backend may or may not include
  course: Course;
  enrollment_date?: string; // backend name
  enrolled_at?: string; // legacy name in UI
  status?: 'active' | 'completed';
  progress: number; // computed via serializer
}

export interface ContentProgress {
  id: number;
  user: number;
  content: number;
  completed: boolean;
  progress_percentage: number;
  last_accessed: string;
}

export interface Submission {
  id: number;
  assignment: Assignment;
  student: User;
  submitted_at: string;
  content?: string;
  file_url?: string;
  grade?: number;
  feedback?: string;
  graded_at?: string;
  graded_by?: User;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginCredentials {
  usernameOrEmail: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  confirm_password: string;
  // Only student and teacher can self-register from the UI
  role: 'student' | 'teacher';
}

export interface ApiResponse<T> {
  count?: number;
  next?: string;
  previous?: string;
  results: T[];
}

export interface DashboardStats {
  total_courses: number;
  enrolled_courses: number;
  completed_courses: number;
  certificates_earned: number;
}

export interface Certificate {
  id: number;
  student: User;
  course: Course;
  issue_date: string;
  verification_code: string;
}