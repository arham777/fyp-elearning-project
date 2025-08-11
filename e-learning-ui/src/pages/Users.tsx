import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/api/users';
import { User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
// No tabs; show two role cards side-by-side for consistency

type RoleCategory = 'teacher' | 'student';

const RoleUsersCard: React.FC<{ title: string; users: User[] }> = ({ title, users }) => {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <span className="text-sm text-muted-foreground">{users.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {users.map((u) => {
          const initials = `${u.first_name?.[0] ?? ''}${u.last_name?.[0] ?? ''}` || (u.username?.slice(0, 2) ?? 'U');
          const created = new Date(u.created_at).toLocaleDateString();
          return (
            <div key={u.id} className="flex items-center justify-between gap-3 p-2 rounded-lg border border-border/40">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{initials.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{u.first_name || u.last_name ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() : u.username}</div>
                  <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground shrink-0">{created}</div>
            </div>
          );
        })}
        {users.length === 0 && (
          <div className="text-sm text-muted-foreground">No users</div>
        )}
      </CardContent>
    </Card>
  );
};

const UsersPage: React.FC = () => {
  const { data: allUsers = [], isLoading } = useQuery<User[]>({
    queryKey: ['users','all'],
    queryFn: usersApi.getUsers,
  });

  const byRole = React.useMemo(() => {
    const grouped: Record<RoleCategory, User[]> = { teacher: [], student: [] };
    for (const u of allUsers) {
      if (u.role === 'teacher') grouped.teacher.push(u);
      else if (u.role === 'student') grouped.student.push(u);
    }
    return grouped;
  }, [allUsers]);

  if (isLoading) {
    return (
      <div className="min-h-[40vh] grid place-items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Users</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RoleUsersCard title={`Teachers`} users={byRole.teacher} />
        <RoleUsersCard title={`Students`} users={byRole.student} />
      </div>
    </div>
  );
};

export default UsersPage;


