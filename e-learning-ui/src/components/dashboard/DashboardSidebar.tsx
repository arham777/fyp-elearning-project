import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  GraduationCap,
  BookOpen,
  Users,
  Settings,
  BarChart3,
  PlusCircle,
  Calendar,
  Award,
  User,
  LogOut,
  ClipboardList,
} from 'lucide-react';

interface NavigationItem {
  icon: React.ElementType;
  label: string;
  href: string;
  roles: string[];
}

const navigationItems: NavigationItem[] = [
  {
    icon: BarChart3,
    label: 'Dashboard',
    href: '/dashboard',
    roles: ['student', 'teacher', 'admin'],
  },
  {
    icon: BookOpen,
    label: 'My Courses',
    href: '/dashboard/courses',
    roles: ['student', 'teacher'],
  },
  {
    icon: ClipboardList,
    label: 'Assignments',
    href: '/dashboard/assignments',
    roles: ['student', 'teacher'],
  },
  {
    icon: Award,
    label: 'Certificates',
    href: '/dashboard/certificates',
    roles: ['student'],
  },
  {
    icon: PlusCircle,
    label: 'Create Course',
    href: '/dashboard/create-course',
    roles: ['teacher'],
  },
  {
    icon: Users,
    label: 'Students',
    href: '/dashboard/students',
    roles: ['teacher'],
  },
  {
    icon: Users,
    label: 'User Management',
    href: '/dashboard/users',
    roles: ['admin'],
  },
  {
    icon: Settings,
    label: 'System Settings',
    href: '/dashboard/settings',
    roles: ['admin'],
  },
];

const DashboardSidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const filteredNavigation = navigationItems.filter(item =>
    item.roles.includes(user.role)
  );

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-border">
        <Link to="/dashboard" className="flex items-center space-x-3">
          <div className="p-2 bg-primary rounded-lg">
            <GraduationCap className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">EduPlatform</h1>
            <p className="text-xs text-muted-foreground capitalize">{user.role} Portal</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {filteredNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-[var(--transition-fast)]',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-border">
        <div className="space-y-2">
          <Link
            to="/dashboard/profile"
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-[var(--transition-fast)]"
          >
            <User className="h-5 w-5" />
            <span>Profile</span>
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-[var(--transition-fast)]"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
        </div>
        
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-sm font-medium text-foreground">
            {user.first_name} {user.last_name}
          </p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardSidebar;