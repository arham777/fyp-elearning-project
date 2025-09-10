import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/admin';
import { Course } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  MoreHorizontal, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Eye,
  Users,
  Clock,
  BookOpen
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import CourseActionDialog from '@/components/admin/CourseActionDialog';

 

const getStatusBadge = (status: Course['status']) => {
  switch (status) {
    case 'published':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Published</Badge>;
    case 'pending':
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
    case 'draft':
      return <Badge variant="secondary">Draft</Badge>;
    case 'rejected':
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const CourseManagement: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [dialogState, setDialogState] = React.useState<{
    course: Course | null;
    action: 'approve' | 'reject' | 'delete' | null;
    isOpen: boolean;
    note: string;
  }>({
    course: null,
    action: null,
    isOpen: false,
    note: '',
  });

  const { data: courses = [], isLoading } = useQuery<Course[]>({
    queryKey: ['admin', 'courses'],
    queryFn: adminApi.getAllCourses,
  });

  const courseActionMutation = useMutation({
    mutationFn: async ({ course, action, note }: { course: Course; action: 'approve' | 'reject' | 'delete'; note?: string }) => {
      switch (action) {
        case 'approve':
          return await adminApi.approveCourse(course.id, note);
        case 'reject':
          return await adminApi.rejectCourse(course.id, note || '');
        case 'delete':
          await adminApi.deleteCourse(course.id);
          return { course, action };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] });
      const actionText = dialogState.action === 'approve' ? 'approved' : 
                         dialogState.action === 'reject' ? 'rejected' : 'deleted';
      toast({
        title: "Success",
        description: `Course ${actionText} successfully.`,
      });
      setDialogState({ course: null, action: null, isOpen: false, note: '' });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to perform action. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCourseAction = (course: Course, action: 'approve' | 'reject' | 'delete') => {
    setDialogState({ course, action, isOpen: true, note: '' });
  };

  const handleConfirmAction = () => {
    if (dialogState.course && dialogState.action) {
      if (dialogState.action === 'reject' && !dialogState.note.trim()) {
        toast({ title: 'Rejection note required', description: 'Please provide a reason to help the teacher fix issues.', variant: 'destructive' });
        return;
      }
      courseActionMutation.mutate({ 
        course: dialogState.course, 
        action: dialogState.action,
        note: dialogState.note.trim() || undefined,
      });
    }
  };

  const filteredCourses = React.useMemo(() => {
    if (statusFilter === 'all') return courses;
    return courses.filter(course => course.status === statusFilter);
  }, [courses, statusFilter]);

  const stats = React.useMemo(() => {
    return {
      total: courses.length,
      published: courses.filter(c => c.status === 'published').length,
      pending: courses.filter(c => c.status === 'pending').length,
      draft: courses.filter(c => c.status === 'draft').length,
    };
  }, [courses]);

  if (isLoading) {
    return (
      <div className="min-h-[40vh] grid place-items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Course Management</h1>
        <p className="text-muted-foreground">Review and manage all courses on your platform</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.published}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <XCircle className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="pending">Pending Approval</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Courses List */}
      <div className="space-y-4">
        {filteredCourses.map((course) => (
          <Card key={course.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold truncate">{course.title}</h3>
                    {getStatusBadge(course.status)}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {course.description}
                  </p>
                  
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {`${course.teacher.first_name?.[0] || ''}${course.teacher.last_name?.[0] || ''}` || course.teacher.username?.slice(0, 2) || 'T'}
                        </AvatarFallback>
                      </Avatar>
                      <span>{`${course.teacher.first_name || ''} ${course.teacher.last_name || ''}`.trim() || course.teacher.username}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{course.enrollment_count || course.enrollments || 0} enrolled</span>
                    </div>
                    
                    <span>Created {new Date(course.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/app/admin/courses/${course.id}`)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Course
                    </DropdownMenuItem>
                    
                    {course.status === 'pending' && (
                      <>
                        <DropdownMenuItem onClick={() => handleCourseAction(course, 'approve')}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve Course
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCourseAction(course, 'reject')}>
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject Course
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    <DropdownMenuItem 
                      onClick={() => handleCourseAction(course, 'delete')}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Course
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {filteredCourses.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No courses found</h3>
              <p className="text-muted-foreground">
                {statusFilter === 'all' 
                  ? 'No courses have been created yet.' 
                  : `No courses with status "${statusFilter}" found.`
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <CourseActionDialog
        course={dialogState.course}
        action={dialogState.action}
        isOpen={dialogState.isOpen}
        note={dialogState.note}
        setNote={(v) => setDialogState((s) => ({ ...s, note: v }))}
        onClose={() => setDialogState({ course: null, action: null, isOpen: false, note: '' })}
        onConfirm={handleConfirmAction}
      />
    </div>
  );
};

export default CourseManagement;
