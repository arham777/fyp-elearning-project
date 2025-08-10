import React from 'react';
import { Bell, Search, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme } from "next-themes";
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const DashboardHeader: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();

  const baseLinks = [
    { to: '/', label: 'Dashboard', roles: ['student','teacher','admin'] },
    { to: '/courses', label: 'Courses', roles: ['student','teacher'] },
    { to: '/assignments', label: 'Assignments', roles: ['student','teacher'] },
    { to: '/certificates', label: 'Certificates', roles: ['student'] },
    { to: '/create-course', label: 'Create', roles: ['teacher'] },
    { to: '/students', label: 'Students', roles: ['teacher'] },
    { to: '/users', label: 'Users', roles: ['admin'] },
    { to: '/settings', label: 'Settings', roles: ['admin'] },
  ];

  const links = user ? baseLinks.filter(l => l.roles.includes(user.role)) : [];
  const initials = React.useMemo(() => {
    if (!user) return 'U';
    const first = user.first_name?.[0] ?? '';
    const last = user.last_name?.[0] ?? '';
    const fallback = user.username?.slice(0, 2) ?? 'U';
    const value = `${first}${last}` || fallback;
    return value.toUpperCase();
  }, [user]);

  return (
    <header className="sticky top-0 z-40 bg-background">
      <div className="mx-auto max-w-screen-2xl px-3 py-2">
        <div className="h-12 w-full rounded-full border border-border/60 bg-ink/[0.05] shadow-sm flex items-center justify-between gap-3 px-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent-orange/15 text-[0] ring-1 ring-accent-orange/30">
                <GraduationCap className="h-4 w-4 text-accent-orange" />
              </span>
              <div className="leading-tight">
                <span className="block text-sm font-semibold">EduPlatform</span>
                {user && (
                  <span className="block text-[10px] text-muted-foreground capitalize">{user.role} Portal</span>
                )}
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1 ml-2">
              {links.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-full text-sm transition-all duration-200 ${
                      (isActive || location.pathname === link.to)
                        ? 'bg-ink/20 text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-ink/5'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <div className="relative hidden sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
              <Input
                placeholder="Search…"
                className="h-9 w-64 pl-10 pr-4 text-sm rounded-full border-transparent bg-ink/5 backdrop-blur-sm placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-ring transition-colors"
              />
            </div>

            <Button aria-label="Notifications" variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-ink/10">
              <Bell className="h-4 w-4" />
            </Button>

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 ml-1">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user.avatar} alt={user.username} />
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 p-0 rounded-xl shadow-lg">
                  <div className="p-4 pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar} alt={user.username} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{user.first_name || user.username}</p>
                        {user.email && (
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="w-full">View profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                    {`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;