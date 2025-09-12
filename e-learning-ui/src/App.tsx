import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StudentDashboard from "@/pages/studentRole/StudentDashboard";
import TeacherDashboard from "@/pages/teacherRole/TeacherDashboard";
import AdminDashboard from "@/pages/adminRole/AdminDashboard";
import CoursesCatalog from "@/pages/CoursesCatalog";
import MyCourses from "@/pages/MyCourses";
import CourseDetail from "@/pages/CourseDetail";
import ModuleDetail from "@/pages/ModuleDetail";
import ContentViewer from "@/pages/ContentViewer";
import AssignmentDetail from "./pages/AssignmentDetail";
import CourseViewer from "@/pages/CourseViewer";
import NotFound from "@/pages/NotFound";
import UsersPage from "@/pages/adminRole/Users";
import CourseManagement from "@/pages/adminRole/CourseManagement";
import CertificateManagement from "@/pages/adminRole/CertificateManagement";
import Settings from "@/pages/adminRole/Settings";
import Profile from "@/pages/Profile";
import { ThemeProvider } from "next-themes";
import Index from "@/pages/Index";
import StudentsPage from "@/pages/teacherRole/Students";
import { queryClient } from "@/lib/queryClient";
import CertificatesPage from "@/pages/Certificates";
import CertificateView from "@/pages/CertificateView";
import AdminCourseView from "@/pages/adminRole/AdminCourseView";

// centralized queryClient moved to `lib/queryClient` so we can clear cache on logout

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Role-based Dashboard Component
const RoleDashboard: React.FC = () => {
  const { user } = useAuth();
  
  if (!user) return null;
  
  switch (user.role) {
    case 'student':
      return <StudentDashboard />;
    case 'teacher':
      return <TeacherDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      return <StudentDashboard />;
  }
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <AuthProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<LoginForm />} />
              <Route path="/register" element={<RegisterForm />} />

              {/* Backward-compat redirects for old non-/app URLs */}
              <Route path="/courses/:id" element={<Navigate to="/app/courses/:id" replace />} />
              <Route path="/courses/:id/modules/:moduleId" element={<Navigate to="/app/courses/:id/modules/:moduleId" replace />} />

              {/* Protected App Shell mounted at /app */}
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                {/* Home dashboard at /app */}
                <Route index element={<RoleDashboard />} />

                {/* Top-level sections */}
                <Route path="my-courses" element={<MyCourses />} />
                <Route path="courses" element={<CoursesCatalog />} />
                <Route path="courses/:id" element={<CourseDetail />} />
                <Route path="courses/:id/modules/:moduleId" element={<ModuleDetail />} />
                <Route path="courses/:id/modules/:moduleId/content/:contentId" element={<ContentViewer />} />
                <Route path="courses/:id/assignments/:assignmentId" element={<AssignmentDetail />} />
                {/* Admin read-only course view */}
                <Route path="admin/courses/:id" element={<AdminCourseView />} />
                {/* Admin-scoped content viewer (keeps admin back navigation) */}
                <Route path="admin/courses/:id/modules/:moduleId/content/:contentId" element={<ContentViewer />} />
                {/* Admin-scoped assignment detail */}
                <Route path="admin/courses/:id/assignments/:assignmentId" element={<AssignmentDetail />} />

                <Route path="my-courses/:id" element={<CourseViewer />} />
                <Route path="my-courses/:id/modules/:moduleId" element={<CourseViewer />} />
                <Route path="my-courses/:id/modules/:moduleId/content/:contentId" element={<CourseViewer />} />
                <Route path="my-courses/:id/assignments/:assignmentId" element={<AssignmentDetail />} />
                <Route path="certificates" element={<CertificatesPage />} />
                <Route path="certificates/:id" element={<CertificateView />} />
                <Route path="students" element={<StudentsPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="course-management" element={<CourseManagement />} />
                <Route path="certificate-management" element={<CertificateManagement />} />
                <Route path="settings" element={<Settings />} />
                <Route path="profile" element={<Profile />} />
                {/* Redirect old /app/assignments URL to dashboard */}
                <Route path="assignments" element={<Navigate to="/app" replace />} />
              </Route>

              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
