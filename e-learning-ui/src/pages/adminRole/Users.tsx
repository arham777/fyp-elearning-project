import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { useToast } from '../../hooks/use-toast';
import { User } from '../../types';
import { adminApi } from '../../api/admin';
import { MoreHorizontal, UserX, UserMinus, GraduationCap, BookOpen } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";

type RoleCategory = 'teacher' | 'student';

interface UserActionDialogProps {
  user: User | null;
  action: 'add' | 'remove' | 'block' | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (userData?: any) => void;
}

const UserActionDialog: React.FC<UserActionDialogProps> = ({ 
  user, 
  action, 
  isOpen, 
  onClose, 
  onConfirm 
}) => {
  const [formData, setFormData] = React.useState({
    first_name: '',
    last_name: '',
    email: '',
    role: 'teacher' as 'student' | 'teacher'
  });

  const getDialogContent = () => {
    switch (action) {
      case 'add':
        return {
          title: 'Add New Teacher',
          description: 'Enter details for the new teacher.'
        };
      case 'remove':
        return {
          title: 'Remove User',
          description: `Are you sure you want to remove "${user?.first_name} ${user?.last_name}"? This action cannot be undone.`
        };
      case 'block':
        return {
          title: 'Block Student',
          description: `Are you sure you want to block "${user?.first_name} ${user?.last_name}"? They will not be able to access the platform.`
        };
      default:
        return { title: '', description: '' };
    }
  };

  const { title, description } = getDialogContent();

  const handleSubmit = () => {
    if (action === 'add') {
      onConfirm(formData);
    } else {
      onConfirm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        {action === 'add' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                  placeholder="Enter last name"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'student' | 'teacher' }))}
                className="w-full p-2 border rounded-md"
                disabled
              >
                <option value="teacher">Teacher</option>
              </select>
            </div>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            variant={action === 'remove' || action === 'block' ? 'destructive' : 'default'}
            onClick={handleSubmit}
            disabled={action === 'add' && (!formData.first_name || !formData.email)}
          >
            {action === 'add' ? 'Add User' : 
             action === 'remove' ? 'Remove' : 
             action === 'block' ? 'Block' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const RoleUsersCard: React.FC<{ 
  title: string; 
  users: User[]; 
  role: RoleCategory;
  onUserAction: (user: User | null, action: 'add' | 'remove' | 'block') => void;
}> = ({ title, users, role, onUserAction }) => {
	return (
		<Card className="border-border/60">
			<CardHeader>
				<CardTitle className="flex items-center justify-between">
					<span>{title}</span>
					<div className="flex items-center gap-2">
						<span className="text-sm text-muted-foreground">{users.length}</span>
					</div>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				{users.map((u) => {
					const initials = `${u.first_name?.[0] ?? ''}${u.last_name?.[0] ?? ''}` || ((u.username?.slice(0, 2) ?? 'U'));
					const enrolledCourses = role === 'student' ? Math.floor(Math.random() * 5) + 1 : 0;
					const createdCourses = role === 'teacher' ? Math.floor(Math.random() * 3) + 1 : 0;
					
					return (
						<div key={u.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/40">
							<div className="flex items-center gap-3 min-w-0 flex-1">
								<Avatar className="h-10 w-10">
									<AvatarFallback>{initials.toUpperCase()}</AvatarFallback>
								</Avatar>
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<div className="text-sm font-medium truncate">
											{u.first_name || u.last_name ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() : u.username}
										</div>
									</div>
									<div className="text-xs text-muted-foreground truncate">{u.email}</div>
									<div className="text-xs text-muted-foreground flex items-center gap-4">
										{role === 'student' && (
											<span className="flex items-center gap-1">
												<BookOpen className="h-3 w-3" />
												{enrolledCourses} courses
											</span>
										)}
										{role === 'teacher' && (
											<span className="flex items-center gap-1">
												<GraduationCap className="h-3 w-3" />
												{createdCourses} courses created
											</span>
										)}
									</div>
								</div>
							</div>
							
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
										<MoreHorizontal className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									{role === 'student' && (
										<>
											<DropdownMenuItem onClick={() => onUserAction(u, 'block')}>
												<UserX className="mr-2 h-4 w-4" />
												Block Student
											</DropdownMenuItem>
										</>
									)}
									<DropdownMenuItem 
										onClick={() => onUserAction(u, 'remove')}
										className="text-destructive focus:text-destructive"
									>
										<UserMinus className="mr-2 h-4 w-4" />
										Remove User
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					);
				})}
				{users.length === 0 && (
					<div className="text-sm text-muted-foreground text-center py-4">No {role}s found</div>
				)}
			</CardContent>
		</Card>
	);
};

const Users: React.FC = () => {
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const [searchTerm, setSearchTerm] = React.useState('');
	const [activeTab, setActiveTab] = React.useState('users');
	const [dialogState, setDialogState] = React.useState<{
		user: User | null;
		action: 'add' | 'remove' | 'block' | null;
		isOpen: boolean;
	}>({
		user: null,
		action: null,
		isOpen: false
	});

	const { data: allUsers = [], isLoading } = useQuery<User[]>({
		queryKey: ['admin', 'users'],
		queryFn: adminApi.getAllUsers,
	});


	const userActionMutation = useMutation({
		mutationFn: async ({ user, action, userData }: { 
			user?: User; 
			action: 'add' | 'remove' | 'block'; 
			userData?: any 
		}) => {
			switch (action) {
				case 'add':
					return await adminApi.createUser(userData);
				case 'remove':
					if (user?.id) {
						await adminApi.deleteUser(user.id);
						return { user, action };
					}
					break;
				case 'block':
					if (user?.id) {
						return await adminApi.blockUser(user.id);
					}
					break;
			}
			return { user, action, userData };
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
			const actionText = dialogState.action === 'add' ? 'added' : 
									 dialogState.action === 'remove' ? 'removed' : 'blocked';
			toast({
				title: "Success",
				description: `User ${actionText} successfully.`,
			});
			setDialogState({ user: null, action: null, isOpen: false });
		},
		onError: (error) => {
			toast({
				title: "Error",
				description: "Failed to perform action.",
				variant: "destructive",
			});
		}
	});

	const byRole = React.useMemo(() => {
		const grouped: Record<RoleCategory, User[]> = { teacher: [], student: [] };
		for (const u of allUsers) {
			if (u.role === 'teacher') grouped.teacher.push(u);
			else if (u.role === 'student') grouped.student.push(u);
		}
		return grouped;
	}, [allUsers]);

	const handleUserAction = (user: User | null, action: 'add' | 'remove' | 'block') => {
		setDialogState({ user, action, isOpen: true });
	};

	const handleConfirmAction = (userData?: any) => {
		if (dialogState.action) {
			userActionMutation.mutate({ 
				user: dialogState.user || undefined, 
				action: dialogState.action,
				userData
			});
		}
	};


	if (isLoading) {
		return <div>Loading...</div>;
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">User Management</h1>
				<p className="text-muted-foreground">Manage students and teachers</p>
			</div>
			
			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList>
					<TabsTrigger value="users">Users</TabsTrigger>
				</TabsList>
				
				<TabsContent value="users" className="space-y-6">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<RoleUsersCard 
							title="Students" 
							users={byRole.student} 
							role="student"
							onUserAction={handleUserAction}
						/>
						<RoleUsersCard 
							title="Teachers" 
							users={byRole.teacher} 
							role="teacher"
							onUserAction={handleUserAction}
						/>
					</div>
				</TabsContent>
			</Tabs>

			<UserActionDialog
				user={dialogState.user}
				action={dialogState.action}
				isOpen={dialogState.isOpen}
				onClose={() => setDialogState({ user: null, action: null, isOpen: false })}
				onConfirm={handleConfirmAction}
			/>

		</div>
	);
};

export default Users;


