import React from 'react';
import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useTheme } from "next-themes";

const DashboardHeader: React.FC = () => {
  const { theme, setTheme } = useTheme();
  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center space-x-4 flex-1">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses, assignments..."
            className="pl-10 w-80"
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Light</span>
            <Switch
                checked={theme === "dark"}
                onCheckedChange={(checked) => {
                    setTheme(checked ? "dark" : "light");
                }}
            />
            <span className="text-sm text-muted-foreground">Dark</span>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;