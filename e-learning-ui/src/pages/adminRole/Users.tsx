import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { useToast } from '../../hooks/use-toast';
import { User, UserBadge } from '../../types';
import { adminApi } from '../../api/admin';
import * as gamificationApi from '../../api/gamification';
import { 
  MoreHorizontal, UserX, UserMinus, GraduationCap, BookOpen, Award,
  Flame, Zap, Crown, Medal, Target, Rocket, Star, Trophy, Search, X, Users as UsersIcon, ChevronsRight
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import { cn } from '../../lib/utils';

type RoleCategory = 'teacher' | 'student';

// Badge icon mapping
const BADGE_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  'streak_7': { icon: Flame, color: 'text-orange-400' },
  'streak_30': { icon: Zap, color: 'text-yellow-400' },
  'streak_100': { icon: Crown, color: 'text-amber-400' },
  'first_course': { icon: GraduationCap, color: 'text-blue-400' },
  'courses_5': { icon: BookOpen, color: 'text-indigo-400' },
  'courses_10': { icon: Medal, color: 'text-purple-400' },
  'perfect_score': { icon: Target, color: 'text-emerald-400' },
  'quick_learner': { icon: Rocket, color: 'text-cyan-400' },
  'reviewer': { icon: Star, color: 'text-yellow-400' },
  'top_3': { icon: Trophy, color: 'text-amber-400' },
};

const DEFAULT_BADGE_ICON = { icon: Award, color: 'text-neutral-400' };

interface UserActionDialogProps {
  user: User | null;
  action: 'add' | 'remove' | 'block' | 'unblock' | null;
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
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: 'teacher' as 'student' | 'teacher'
  });
  const [blockData, setBlockData] = useState<{ reason: string; duration_days?: number; until?: string }>({
    reason: '',
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
          description: `Block "${user?.first_name} ${user?.last_name}" and set reason and duration. They will immediately lose access.`
        };
      case 'unblock':
        return {
          title: 'Unblock Student',
          description: `Unblock "${user?.first_name} ${user?.last_name}" so they can access the platform again.`
        };
      default:
        return { title: '', description: '' };
    }
  };

  const { title, description } = getDialogContent();

  const handleSubmit = () => {
    if (action === 'add') {
      onConfirm(formData);
    } else if (action === 'block') {
      onConfirm(blockData);
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

        {action === 'block' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Reason</Label>
              <Input
                id="reason"
                value={blockData.reason}
                onChange={(e) => setBlockData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Enter reason for blocking"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration_days">Duration (days)</Label>
                <Input
                  id="duration_days"
                  type="number"
                  min={1}
                  value={blockData.duration_days ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setBlockData(prev => ({ ...prev, duration_days: v ? Number(v) : undefined }));
                  }}
                  placeholder="e.g. 7"
                />
              </div>
              <div>
                <Label htmlFor="until">Or block until date</Label>
                <Input
                  id="until"
                  type="datetime-local"
                  value={blockData.until ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setBlockData(prev => ({ ...prev, until: v || undefined }));
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">If both provided, specific date takes precedence.</p>
              </div>
            </div>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            variant={action === 'remove' || action === 'block' ? 'destructive' : 'default'}
            onClick={handleSubmit}
            disabled={(action === 'add' && (!formData.first_name || !formData.email)) || (action === 'block' && !blockData.reason)}
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

// Component to display student badges
const StudentBadges: React.FC<{ userId: number }> = ({ userId }) => {
  const { data: badges = [], isLoading } = useQuery({
    queryKey: ['admin', 'user-badges', userId],
    queryFn: () => gamificationApi.getUserBadges(userId),
  });

  if (isLoading) {
    return <div className="flex gap-1 animate-pulse"><div className="w-4 h-4 bg-muted rounded" /></div>;
  }

  if (badges.length === 0) {
    return <span className="text-xs text-muted-foreground">No badges</span>;
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 flex-wrap">
        {badges.slice(0, 5).map((userBadge) => {
          const { icon: Icon, color } = BADGE_ICONS[userBadge.badge.code] || DEFAULT_BADGE_ICON;
          return (
            <Tooltip key={userBadge.id}>
              <TooltipTrigger>
                <div className="w-5 h-5 rounded bg-neutral-800 flex items-center justify-center">
                  <Icon className={cn('w-3 h-3', color)} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-neutral-900 border-neutral-700">
                <p className="font-medium text-xs">{userBadge.badge.name}</p>
                <p className="text-[10px] text-neutral-400">{userBadge.badge.description}</p>
                <p className="text-[10px] text-neutral-500 mt-1">
                  Earned: {new Date(userBadge.earned_at).toLocaleDateString()}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
        {badges.length > 5 && (
          <Tooltip>
            <TooltipTrigger>
              <div className="w-5 h-5 rounded bg-neutral-800 flex items-center justify-center">
                <span className="text-[10px] text-neutral-400">+{badges.length - 5}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-neutral-900 border-neutral-700">
              <p className="text-xs">{badges.length - 5} more badges</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};

const RoleUsersCard: React.FC<{ 
  title: string; 
  users: User[]; 
  role: RoleCategory;
  onUserAction: (user: User | null, action: 'add' | 'remove' | 'block' | 'unblock') => void;
  enrollmentsByStudentId?: Record<number, number>;
  coursesByTeacherId?: Record<number, number>;
  searchQuery?: string;
}> = ({ title, users, role, onUserAction, enrollmentsByStudentId, coursesByTeacherId, searchQuery }) => {
	return (
		<Card className="border-border/60">
			<CardHeader>
				<CardTitle className="flex items-center justify-between">
					<span>{title}</span>
					<div className="flex items-center gap-2">
						<span className="text-sm text-muted-foreground">
							{users.length} {searchQuery && `found`}
						</span>
					</div>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
				{users.map((u) => {
					const initials = `${u.first_name?.[0] ?? ''}${u.last_name?.[0] ?? ''}` || ((u.username?.slice(0, 2) ?? 'U'));
					const enrolledCourses = role === 'student' ? (enrollmentsByStudentId?.[u.id] ?? 0) : 0;
					const createdCourses = role === 'teacher' ? (coursesByTeacherId?.[u.id] ?? 0) : 0;
					const isBlocked = u.is_active === false || !!u.deactivated_until;
					
					return (
						<div key={u.id} className={`flex items-center justify-between gap-3 p-3 rounded-lg border border-border/40 ${isBlocked ? 'bg-destructive/5' : ''}`}>
							<div className="flex items-center gap-3 min-w-0 flex-1">
								<Avatar className="h-10 w-10">
									<AvatarFallback>{initials.toUpperCase()}</AvatarFallback>
								</Avatar>
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<div className="text-sm font-medium truncate">
											{u.first_name || u.last_name ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() : u.username}
										</div>
										{isBlocked && (
										  <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">Blocked</span>
										)}
									</div>
									<div className="text-xs text-muted-foreground truncate">{u.email}</div>
									<div className="text-xs text-muted-foreground flex items-center gap-4 mt-1">
										{role === 'student' && (
											<>
												<span className="flex items-center gap-1">
													<BookOpen className="h-3 w-3" />
													{enrolledCourses} courses
												</span>
												<span className="flex items-center gap-1">
													<Award className="h-3 w-3" />
													<StudentBadges userId={u.id} />
												</span>
											</>
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
											{isBlocked ? (
                                              <DropdownMenuItem onClick={() => onUserAction(u, 'unblock')}>
                                                <UserX className="mr-2 h-4 w-4 rotate-180" />
                                                Unblock Student
                                              </DropdownMenuItem>
                                            ) : (
                                              <DropdownMenuItem onClick={() => onUserAction(u, 'block')}>
                                                <UserX className="mr-2 h-4 w-4" />
                                                Block Student
                                              </DropdownMenuItem>
                                            )}
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
					<div className="text-sm text-muted-foreground text-center py-8">
						{searchQuery ? (
							<div className="space-y-2">
								<Search className="h-8 w-8 mx-auto text-muted-foreground/50" />
								<p>No {role}s matching "{searchQuery}"</p>
							</div>
						) : (
							<p>No {role}s found</p>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
};

// Helper function to normalize text for search
const normalizeText = (text: string | null | undefined): string => {
	return (text || '').toLowerCase().trim();
};

// Helper function to check if user matches search query
const userMatchesSearch = (user: User, query: string): boolean => {
	if (!query) return true;
	
	const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
	const firstName = normalizeText(user.first_name);
	const lastName = normalizeText(user.last_name);
	const username = normalizeText(user.username);
	const email = normalizeText(user.email);
	const fullName = `${firstName} ${lastName}`.trim();
	
	// All search terms must match at least one field
	return searchTerms.every(term => 
		firstName.includes(term) ||
		lastName.includes(term) ||
		fullName.includes(term) ||
		username.includes(term) ||
		email.includes(term)
	);
};

const Users: React.FC = () => {
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const [activeTab, setActiveTab] = useState('users');
	const [searchInput, setSearchInput] = useState('');
	const [searchQuery, setSearchQuery] = useState('');
	const searchInputRef = useRef<HTMLInputElement>(null);
	const [dialogState, setDialogState] = useState<{
		user: User | null;
		action: 'add' | 'remove' | 'block' | 'unblock' | null;
		isOpen: boolean;
	}>({
		user: null,
		action: null,
		isOpen: false
	});

	// Debounce search input
	useEffect(() => {
		const timer = setTimeout(() => {
			setSearchQuery(searchInput.trim());
		}, 300);
		return () => clearTimeout(timer);
	}, [searchInput]);

	const { data: allUsers = [], isLoading } = useQuery<User[]>({
		queryKey: ['admin', 'users'],
		queryFn: adminApi.getAllUsers,
	});

	// Fetch courses and enrollments to compute real insights
	const { data: allCourses = [] } = useQuery({
		queryKey: ['admin', 'courses'],
		queryFn: adminApi.getAllCourses,
	});

	const { data: allEnrollments = [] } = useQuery({
		queryKey: ['admin', 'enrollments'],
		queryFn: adminApi.getAllEnrollments,
	});


	const userActionMutation = useMutation({
		mutationFn: async ({ user, action, userData }: { 
			user?: User; 
			action: 'add' | 'remove' | 'block' | 'unblock'; 
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
						return await adminApi.blockUser(user.id, userData);
					}
					break;
				case 'unblock':
					if (user?.id) {
						return await adminApi.unblockUser(user.id);
					}
					break;
			}
			return { user, action, userData };
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
			const actionText = dialogState.action === 'add' ? 'added' : 
										 dialogState.action === 'remove' ? 'removed' : 
										 dialogState.action === 'unblock' ? 'unblocked' : 'blocked';
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

	// Filter and group users by role
	const { filteredStudents, filteredTeachers, totalMatches } = useMemo(() => {
		const students: User[] = [];
		const teachers: User[] = [];
		
		for (const user of allUsers) {
			if (!userMatchesSearch(user, searchQuery)) continue;
			
			if (user.role === 'student') students.push(user);
			else if (user.role === 'teacher') teachers.push(user);
		}
		
		return {
			filteredStudents: students,
			filteredTeachers: teachers,
			totalMatches: students.length + teachers.length,
		};
	}, [allUsers, searchQuery]);

	// Precompute insights maps
	const enrollmentsByStudentId = useMemo(() => {
		const map: Record<number, number> = {};
		for (const enr of allEnrollments as any[]) {
			const studentId = typeof enr.student === 'object' ? enr.student?.id : enr.student;
			if (typeof studentId === 'number') map[studentId] = (map[studentId] || 0) + 1;
		}
		return map;
	}, [allEnrollments]);

	const coursesByTeacherId = useMemo(() => {
		const map: Record<number, number> = {};
		for (const c of allCourses as any[]) {
			const teacherId = typeof c.teacher === 'object' ? c.teacher?.id : c.teacher;
			if (typeof teacherId === 'number') map[teacherId] = (map[teacherId] || 0) + 1;
		}
		return map;
	}, [allCourses]);

	const handleUserAction = (user: User | null, action: 'add' | 'remove' | 'block' | 'unblock') => {
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

	const handleClearSearch = () => {
		setSearchInput('');
		setSearchQuery('');
		searchInputRef.current?.focus();
	};


	if (isLoading) {
		return (
			<div className="min-h-[40vh] grid place-items-center">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold">User Management</h1>
					<p className="text-muted-foreground">Manage students and teachers</p>
				</div>
				
				{/* Stats Summary */}
				<div className="flex items-center gap-4 text-sm">
					<div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full">
						<UsersIcon className="h-4 w-4 text-muted-foreground" />
						<span className="text-muted-foreground">{allUsers.length} total users</span>
					</div>
				</div>
			</div>

			{/* Search Bar */}
			<div className="relative max-w-xl w-full" role="search">
				<Search 
					className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" 
					aria-hidden="true" 
				/>
				<Input
					ref={searchInputRef}
					type="text"
					placeholder="Search..."
					value={searchInput}
					onChange={(e) => setSearchInput(e.target.value)}
					className="pl-10 pr-24 h-10 rounded-full"
					aria-label="Search users"
				/>
				{searchInput && (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="h-8 w-8 absolute right-12 top-1/2 -translate-y-1/2 rounded-full"
						onClick={handleClearSearch}
						aria-label="Clear search"
					>
						<X className="h-4 w-4" />
					</Button>
				)}
				<Button
					variant="link"
					className="h-10 absolute right-3 top-1/2 -translate-y-1/2 p-0 rounded-none"
					aria-label="Search"
				>
					<ChevronsRight className="h-8 w-8" strokeWidth={3} />
				</Button>
			</div>
			
			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList>
					<TabsTrigger value="users">Users</TabsTrigger>
				</TabsList>
				
				<TabsContent value="users" className="space-y-6">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<RoleUsersCard 
							title="Students" 
							users={filteredStudents} 
							role="student"
							onUserAction={handleUserAction}
							enrollmentsByStudentId={enrollmentsByStudentId}
							searchQuery={searchQuery}
						/>
						<RoleUsersCard 
							title="Teachers" 
							users={filteredTeachers} 
							role="teacher"
							onUserAction={handleUserAction}
							coursesByTeacherId={coursesByTeacherId}
							searchQuery={searchQuery}
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
