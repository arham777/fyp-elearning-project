import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { coursesApi } from '@/api/courses';
import { useAuth } from '@/contexts/AuthContext';
import { Course, CourseModule, Content, Assignment } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { adminApi } from '@/api/admin';
import CourseActionDialog from '@/components/admin/CourseActionDialog';
import { useToast } from '@/hooks/use-toast';
import { Star, FileText } from 'lucide-react';

const StatusBadge: React.FC<{ course: Course | null }> = ({ course }) => {
  if (!course) return null;
  const status = (course as unknown as { status?: Course['status'] }).status;
  if (course.is_published) return <Badge>Published</Badge>;
  if (status === 'pending') return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending approval</Badge>;
  if (status === 'rejected') return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>;
  return <Badge variant="secondary">Draft</Badge>;
};

const AdminCourseView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const courseId = Number(id);

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [moduleContents, setModuleContents] = useState<Record<number, Content[]>>({});
  const [moduleAssignments, setModuleAssignments] = useState<Record<number, Assignment[]>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [dialogState, setDialogState] = useState<{
    course: Course | null;
    action: 'approve' | 'reject' | 'delete' | null;
    isOpen: boolean;
    note: string;
  }>({ course: null, action: null, isOpen: false, note: '' });

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin') {
      navigate('/app', { replace: true });
      return;
    }
    const load = async () => {
      try {
        const [c, mods] = await Promise.all([
          coursesApi.getCourse(courseId),
          coursesApi.getCourseModules(courseId).catch(() => [] as CourseModule[]),
        ]);
        setCourse(c);
        setModules(mods as CourseModule[]);
        const contentsMap: Record<number, Content[]> = {};
        const assignmentsMap: Record<number, Assignment[]> = {};
        for (const mod of mods as CourseModule[]) {
          try {
            const [contents, assignments] = await Promise.all([
              coursesApi.getModuleContents(courseId, mod.id).catch(() => [] as Content[]),
              coursesApi.getCourseAssignments(courseId, { module: mod.id }).catch(() => [] as Assignment[]),
            ]);
            contentsMap[mod.id] = contents as Content[];
            assignmentsMap[mod.id] = assignments as Assignment[];
          } catch {
            contentsMap[mod.id] = contentsMap[mod.id] || [];
            assignmentsMap[mod.id] = assignmentsMap[mod.id] || [];
          }
        }
        setModuleContents(contentsMap);
        setModuleAssignments(assignmentsMap);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, courseId, navigate]);

  const back = () => navigate('/app/course-management');

  const openAction = (action: 'approve' | 'reject' | 'delete') => {
    if (!course) return;
    setDialogState({ course, action, isOpen: true, note: '' });
  };

  const confirmAction = async () => {
    if (!dialogState.course || !dialogState.action) return;
    try {
      if (dialogState.action === 'approve') {
        const updated = await adminApi.approveCourse(dialogState.course.id, dialogState.note.trim() || undefined);
        setCourse(updated);
        toast({ title: 'Success', description: 'Course approved and published.' });
      } else if (dialogState.action === 'reject') {
        if (!dialogState.note.trim()) {
          toast({ title: 'Rejection note required', description: 'Please provide a reason to help the teacher fix issues.', variant: 'destructive' });
          return;
        }
        const updated = await adminApi.rejectCourse(dialogState.course.id, dialogState.note.trim());
        setCourse(updated);
        toast({ title: 'Success', description: 'Course rejected and teacher notified.' });
      } else if (dialogState.action === 'delete') {
        await adminApi.deleteCourse(dialogState.course.id);
        toast({ title: 'Deleted', description: 'Course deleted successfully.' });
        back();
        return;
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Action failed. Please try again.', variant: 'destructive' });
    } finally {
      setDialogState({ course: null, action: null, isOpen: false, note: '' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-[40vh] grid place-items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Course not found</h1>
          <Button variant="outline" onClick={back}>Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-foreground">{course.title}</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{course.description}</p>
          <div className="mt-3 flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
            <StatusBadge course={course} />
            <Badge variant="secondary">{course.enrollment_count ?? 0} enrolled</Badge>
            {(typeof (course as unknown as { average_rating?: number }).average_rating === 'number') && (
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, idx) => {
                  const starVal = idx + 1;
                  const activeFill = (((course as unknown as { average_rating?: number }).average_rating ?? 0) >= starVal);
                  return (
                    <Star key={idx} className={`w-3.5 h-3.5 ${activeFill ? 'fill-foreground text-foreground' : 'text-muted-foreground'}`} />
                  );
                })}
                <span className="ml-1">{Number(((course as unknown as { average_rating?: number }).average_rating ?? 0)).toFixed(1)}</span>
                <span>({(course as unknown as { ratings_count?: number }).ratings_count ?? 0})</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Approve / Reject visible when pending */}
          {((course as unknown as { status?: Course['status'] }).status === 'pending') && (
            <>
              <Button size="sm" onClick={() => openAction('approve')}>Approve</Button>
              <Button size="sm" variant="destructive" onClick={() => openAction('reject')}>Reject</Button>
            </>
          )}
          <Button variant="outline" onClick={back}>Back</Button>
        </div>
      </div>

      {((course as unknown as { status?: Course['status'] })?.status === 'rejected') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-red-600">Rejected (Teacher-visible note)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {course.approval_note || 'No note provided.'}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Modules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {modules.length === 0 && (
              <div className="text-sm text-muted-foreground">No modules added yet.</div>
            )}
            {modules.map((m, idx) => (
              <div key={m.id} className="border rounded-md">
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{idx + 1}. {m.title}</div>
                    {m.description && (
                      <div className="text-sm text-muted-foreground">{m.description}</div>
                    )}
                  </div>
                  <Badge variant="outline">{((moduleContents[m.id] || []).length + (moduleAssignments[m.id] || []).length)} items</Badge>
                </div>
                {(moduleContents[m.id] || []).length > 0 && (
                  <div className="px-4 pb-4 text-sm space-y-2">
                    {(moduleContents[m.id] || []).map((c) => (
                      <div key={c.id} className="flex items-center justify-between border rounded px-3 py-2">
                        <div className="text-muted-foreground">
                          <div className="font-medium text-foreground">{c.title}</div>
                          <div className="text-xs uppercase tracking-wide">{c.content_type}</div>
                        </div>
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/app/admin/courses/${courseId}/modules/${m.id}/content/${c.id}`}>View</Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {(moduleAssignments[m.id] || []).length > 0 && (
                  <div className="px-4 pb-4 text-sm space-y-2">
                    {(moduleAssignments[m.id] || []).map((a) => (
                      <div key={a.id} className="flex items-center justify-between border rounded px-3 py-2">
                        <div className="text-muted-foreground">
                          <div className="font-medium text-foreground flex items-center gap-2">
                            <FileText className="h-4 w-4 text-orange-600" />
                            {a.title}
                          </div>
                          <div className="text-xs uppercase tracking-wide">{a.assignment_type === 'mcq' ? 'Quiz' : 'Assignment'}</div>
                        </div>
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/app/admin/courses/${courseId}/assignments/${a.id}`}>View</Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ratings List */}
      <RatingsList courseId={courseId} />

      <CourseActionDialog
        course={dialogState.course}
        action={dialogState.action}
        isOpen={dialogState.isOpen}
        note={dialogState.note}
        setNote={(v) => setDialogState((s) => ({ ...s, note: v }))}
        onClose={() => setDialogState({ course: null, action: null, isOpen: false, note: '' })}
        onConfirm={confirmAction}
      />
    </div>
  );
};

export default AdminCourseView;

// Simple ratings list component for admins
interface RatingItem { id: number; student?: { first_name?: string; username?: string }; rating?: number; review?: string; updated_at?: string }

const RatingsList: React.FC<{ courseId: number }> = ({ courseId }) => {
  const [ratings, setRatings] = useState<RatingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await coursesApi.getCourseRatings(courseId);
        const arr = Array.isArray(data) ? data : (data?.results ?? []);
        setRatings(arr);
      } catch (e) {
        setError('Failed to load ratings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [courseId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ratings and Reviews</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="py-6 text-sm text-muted-foreground">Loading ratings…</div>
        )}
        {error && (
          <div className="py-6 text-sm text-destructive">{error}</div>
        )}
        {!loading && !error && ratings.length === 0 && (
          <div className="py-6 text-sm text-muted-foreground">No ratings yet.</div>
        )}
        <div className="space-y-4">
          {ratings.map((r) => (
            <div key={r.id} className="border rounded-md p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">
                  {r?.student?.first_name || r?.student?.username}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {Array.from({ length: 5 }).map((_, idx) => {
                    const starVal = idx + 1;
                    const activeFill = ((r?.rating ?? 0) >= starVal);
                    return (
                      <Star key={idx} className={`w-3.5 h-3.5 ${activeFill ? 'fill-foreground text-foreground' : 'text-muted-foreground'}`} />
                    );
                  })}
                  <span className="ml-1">{Number(r?.rating ?? 0).toFixed(1)}</span>
                </div>
              </div>
              {r?.review && (
                <div className="mt-2 text-sm text-muted-foreground">{r.review}</div>
              )}
              <div className="mt-1 text-xs text-muted-foreground">
                {r?.updated_at ? new Date(r.updated_at).toLocaleString() : ''}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
