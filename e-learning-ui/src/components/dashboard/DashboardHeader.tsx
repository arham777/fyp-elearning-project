import React from 'react';
import { Bell, Search, GraduationCap, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme } from "next-themes";
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
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
import { notificationsApi, type NotificationItem } from '@/api/notifications';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const DashboardHeader: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState<number>(0);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);

  const baseLinks = [
    { to: '/app', label: 'Dashboard', roles: ['student','teacher','admin'] },
    { to: '/app/my-courses', label: 'My Courses', roles: ['student'] },
    { to: '/app/courses', label: 'Courses', roles: ['student','teacher'] },
    { to: '/app/certificates', label: 'Certificates', roles: ['student'] },
    { to: '/app/students', label: 'Students', roles: ['teacher'] },
    { to: '/app/course-management', label: 'Courses', roles: ['admin'] },
    { to: '/app/users', label: 'Users', roles: ['admin'] },
    { to: '/app/settings', label: 'Settings', roles: ['admin'] },
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

  // Fetch unread count on mount and every 60s
  React.useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const fetchCount = async () => {
      try {
        const cnt = await notificationsApi.unreadCount();
        setUnreadCount(cnt);
      } catch (err) {
        console.warn('Failed to fetch unread notification count', err);
      }
    };
    if (user) {
      fetchCount();
      timer = setInterval(fetchCount, 60000);
    }
    return () => timer && clearInterval(timer);
  }, [user]);

  const openNotifications = async () => {
    try {
      // Mark all as read on first open so the badge clears immediately
      if (unreadCount > 0) {
        await notificationsApi.markAllRead();
        setUnreadCount(0);
      }
    } catch (err) {
      console.warn('Failed to mark all notifications as read', err);
    }
    try {
      const list = await notificationsApi.list();
      setNotifications(list);
    } catch (err) {
      console.warn('Failed to load notifications', err);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-background">
      <div className="mx-auto max-w-screen-2xl px-3 py-2">
        <div className="h-12 w-full rounded-full border border-border/60 bg-ink/[0.05] shadow-sm flex items-center justify-between gap-3 px-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/app" className="flex items-center gap-2 shrink-0">
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

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1 ml-2">
              {links.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/app'}
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

            <DropdownMenu open={notifOpen} onOpenChange={(o) => { setNotifOpen(o); if (o) openNotifications(); }}>
              <DropdownMenuTrigger asChild>
                <Button aria-label="Notifications" variant="ghost" size="icon" className="relative h-8 w-8 rounded-full hover:bg-ink/10">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[1rem] px-1 rounded-full bg-red-600 text-[10px] leading-4 text-white grid place-items-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-auto p-0">
                <div className="p-3 border-b">
                  <div className="text-sm font-medium">Notifications</div>
                </div>
                {notifications.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">No notifications</div>
                ) : (
                  notifications.map((n) => (
                    <DropdownMenuItem
                      key={n.id}
                      className="whitespace-normal py-3"
                      onClick={async () => {
                        try { await notificationsApi.markRead(n.id); } catch (err) { console.warn('Failed to mark notification as read', err); }
                        setNotifOpen(false);
                        if (n.course) {
                          if (user?.role === 'admin') {
                            navigate(`/app/admin/courses/${n.course}`);
                          } else {
                            navigate(`/app/courses/${n.course}`);
                          }
                        }
                      }}
                    >
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{n.title}</div>
                        <div className="text-xs text-muted-foreground">{n.message}</div>
                        <div className="text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Navigation Trigger */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-ink/10 md:hidden"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 sm:w-96">
                <SheetHeader>
                  <SheetTitle className="text-left flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent-orange/15 text-[0] ring-1 ring-accent-orange/30">
                      <GraduationCap className="h-4 w-4 text-accent-orange" />
                    </span>
                    <div className="leading-tight">
                      <span className="block text-sm font-semibold">EduPlatform</span>
                      {user && (
                        <span className="block text-[10px] text-muted-foreground capitalize">{user.role} Portal</span>
                      )}
                    </div>
                  </SheetTitle>
                </SheetHeader>
                
                <nav className="flex flex-col gap-2 mt-8">
                  {links.map(link => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.to === '/app'}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                          (isActive || location.pathname === link.to)
                            ? 'bg-ink/10 text-foreground font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-ink/5'
                        }`
                      }
                    >
                      {link.label}
                    </NavLink>
                  ))}
                </nav>

                {/* Mobile User Profile Section */}
                {user && (
                  <div className="mt-auto pt-6 border-t border-border">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar} alt={user.username} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{user.first_name || user.username}</p>
                        {user.email && (
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 px-2 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          // Navigate to profile (you might need to add this route)
                        }}
                        className="justify-start h-9"
                        asChild
                      >
                        <Link to="/app/profile">View Profile</Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="justify-start h-9"
                      >
                        Switch to {theme === 'dark' ? 'Light' : 'Dark'} mode
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          logout();
                          setMobileMenuOpen(false);
                        }}
                        className="justify-start h-9 text-destructive hover:text-destructive"
                      >
                        Sign out
                      </Button>
                    </div>
                  </div>
                )}
              </SheetContent>
            </Sheet>

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
                    <Link to="/app/profile" className="w-full">View profile</Link>
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