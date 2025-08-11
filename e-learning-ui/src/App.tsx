import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StudentDashboard from "@/pages/StudentDashboard";
import TeacherDashboard from "@/pages/TeacherDashboard";
import CoursesCatalog from "@/pages/CoursesCatalog";
import CourseDetail from "@/pages/CourseDetail";
import NotFound from "@/pages/NotFound";
import UsersPage from "@/pages/Users";
import Profile from "@/pages/Profile";
import { ThemeProvider } from "next-themes";

const queryClient = new QueryClient();

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
      return <div>Admin Dashboard - Coming Soon</div>;
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
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginForm />} />
              <Route path="/register" element={<RegisterForm />} />

              {/* Protected App Shell at root */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                {/* Home dashboard at / */}
                <Route index element={<RoleDashboard />} />

                {/* Top-level sections */}
                <Route path="courses" element={<CoursesCatalog />} />
                <Route path="courses/:id" element={<CourseDetail />} />
                <Route path="assignments" element={<div>Assignments - Coming Soon</div>} />
                <Route path="certificates" element={<div>Certificates - Coming Soon</div>} />
                <Route path="create-course" element={<div>Create Course - Coming Soon</div>} />
                <Route path="students" element={<div>Students - Coming Soon</div>} />
                <Route path="users" element={<UsersPage />} />
                <Route path="settings" element={<div>Settings - Coming Soon</div>} />
                <Route path="profile" element={<Profile />} />
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
