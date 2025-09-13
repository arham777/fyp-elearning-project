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
  date_joined?: string;
  avatar?: string;
  is_active?: boolean;
  // Blocking metadata (optional, admin-only)
  deactivated_at?: string | null;
  deactivation_reason?: string | null;
  deactivated_until?: string | null;
}

export interface CourseRating {
  id: number;
  course: number | Course;
  student?: User | null;
  rating: number;
  review?: string | null;
  created_at: string;
  updated_at: string;
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
  status?: 'published' | 'draft' | 'pending' | 'rejected';
  approval_note?: string;
  category?: string;
  modules?: CourseModule[];
  assignments?: Assignment[];
  enrollment_count?: number;
  enrollments?: number;
  average_rating?: number; // computed on backend
  ratings_count?: number; // computed on backend
  my_rating?: number | null; // current student's rating if any
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
  assignment_type: 'mcq' | 'qa';
  title: string;
  description: string;
  total_points: number;
  passing_grade: number;
  max_attempts: number; // NEW: maximum attempts allowed
  created_at: string;
  my_submission_status?: 'submitted' | 'graded';
  my_submission_grade?: number | null;
  // NEW: attempt state exposed by backend
  attempts_used?: number;
  can_attempt?: boolean;
  my_best_grade?: number | null;
  passed?: boolean;
}

export interface AssignmentOption {
  id?: number;
  text: string;
  is_correct: boolean;
  order?: number;
}

export interface AssignmentQuestion {
  id?: number;
  assignment: number;
  question_type: 'mcq' | 'qa';
  text: string;
  points: number;
  order?: number;
  explanation?: string;
  keywords?: string[]; // for QA auto-grading
  required_keywords?: string[];
  negative_keywords?: string[];
  acceptable_answers?: string[];
  options?: AssignmentOption[];
}

export type SubmissionAnswer = {
  question_id: number;
  selected_option_ids?: number[]; // for MCQ
  text_answer?: string; // for QA
};

export interface Enrollment {
  id: number;
  student?: User; // optional; backend may or may not include
  course: Course;
  enrollment_date?: string; // backend name
  enrolled_at?: string; // legacy name in UI
  status?: 'active' | 'completed';
  progress: number; // computed via serializer
}

// Detailed progress for a particular student within a course (teacher view)
export interface StudentCourseProgressModule {
  id: number;
  title: string;
  order: number;
  total_content: number;
  completed_content: number;
  percent: number; // 0..100
  assignments_total: number;
  assignments_passed: number;
}

export interface StudentCourseProgressAssignment {
  id: number;
  title: string;
  assignment_type: 'mcq' | 'qa';
  passing_grade: number;
  max_attempts: number;
  attempts_used: number;
  best_grade: number | null;
  passed: boolean;
  last_submission_date?: string | null;
}

export interface StudentCourseProgress {
  student: User;
  enrollment: { id: number; status: 'active' | 'completed'; enrollment_date: string };
  overall_progress: number; // 0..100
  modules: StudentCourseProgressModule[];
  assignments: StudentCourseProgressAssignment[];
}

// Submissions history per assignment for a given student in a course (teacher view)
export interface StudentSubmissionsResponseAssignment {
  id: number;
  title: string;
  assignment_type: 'mcq' | 'qa';
  passing_grade: number;
  max_attempts: number;
  best_grade: number | null;
  passed: boolean;
  submissions: Submission[];
}

export interface StudentSubmissionsResponse {
  student: User;
  enrollment_id: number;
  assignments: StudentSubmissionsResponseAssignment[];
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
  assignment?: Assignment; // may not be embedded
  student?: User; // present via serializer
  submission_date?: string; // backend field
  submitted_at?: string; // legacy name
  status?: 'submitted' | 'graded';
  attempt_number?: number; // attempt index (1-based)
  content?: string;
  answers?: SubmissionAnswer[]; // student's answers
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
  is_revoked?: boolean;
}

// Support requests (blocked account or general help)
export interface SupportRequest {
  id: number;
  email: string;
  username?: string | null;
  reason_seen?: string | null;
  until_reported?: string | null;
  message?: string | null;
  status: 'open' | 'closed';
  created_at: string;
  handled_at?: string | null;
  handled_by?: User | null;
}

export interface TeacherRequest {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: User;
}