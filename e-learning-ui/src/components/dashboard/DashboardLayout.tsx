import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardHeader from './DashboardHeader';

const DashboardLayout: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return null; // This should be handled by the auth routing
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;