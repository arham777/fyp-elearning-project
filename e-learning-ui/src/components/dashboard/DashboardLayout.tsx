import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardHeader from './DashboardHeader';
import ChatWidget from '@/components/chatbot/ChatWidget';

const DashboardLayout: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return null; // This should be handled by the auth routing
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader />
      <main className="flex-1 p-4">
        <Outlet />
      </main>
      <ChatWidget />
    </div>
  );
};

export default DashboardLayout;
